import { createHash } from "node:crypto";
import { and, desc, eq, getTableColumns, ne, sql } from "drizzle-orm";
import { getLabDatabase } from "../../../server/db/lab-database";
import { auditEvents, purchaseRequests, users } from "../../../server/db/schema";
import type { PurchaseRequestRepository } from "../application/requests";
import { decisionStatuses } from "../domain/procurement";
import type { PurchaseSubmission, TenantActor } from "../domain/procurement";

const requestColumns = getTableColumns(purchaseRequests);
const publicRequest = {
  id: requestColumns.id,
  title: requestColumns.title,
  justification: requestColumns.justification,
  amountMinor: requestColumns.amountMinor,
  currency: requestColumns.currency,
  status: requestColumns.status,
  createdAt: requestColumns.createdAt,
  updatedAt: requestColumns.updatedAt,
};

function scopedTo(actor: TenantActor) {
  return and(
    eq(purchaseRequests.tenantId, actor.tenantId),
    actor.role === "REQUESTER" ? eq(purchaseRequests.requesterId, actor.userId) : undefined,
  );
}

function canonicalSubmission({ title, justification, amountMinor, currency }: PurchaseSubmission) {
  return JSON.stringify(["purchase-v1", title, justification, amountMinor, currency]);
}

export const postgresRequests: PurchaseRequestRepository = {
  create(actor, input, key) {
    const canonical = canonicalSubmission(input);
    const requestHash = createHash("sha256").update(canonical).digest("hex");
    return getLabDatabase().transaction(async (transaction) => {
      const [request] = await transaction.insert(purchaseRequests).values({
        ...input,
        tenantId: actor.tenantId,
        requesterId: actor.userId,
        idempotencyKey: key,
        requestHash,
      }).onConflictDoNothing({
        target: [purchaseRequests.tenantId, purchaseRequests.idempotencyKey],
      }).returning(publicRequest);

      if (request) {
        await transaction.insert(auditEvents).values({
          tenantId: actor.tenantId,
          requestId: request.id,
          actorId: actor.userId,
          type: "CREATED",
        });
        return { kind: "created", request };
      }

      // A new statement sees the winning commit after the unique-key conflict.
      const [existing] = await transaction.select({
        request: publicRequest,
        requesterId: purchaseRequests.requesterId,
      }).from(purchaseRequests)
        .where(and(
          eq(purchaseRequests.tenantId, actor.tenantId),
          eq(purchaseRequests.idempotencyKey, key),
        )).limit(1);
      if (!existing) throw new Error("The purchase request that owns the idempotency key could not be read.");
      if (existing.requesterId !== actor.userId || canonicalSubmission(existing.request) !== canonical) {
        return { kind: "conflict" };
      }
      return { kind: "replayed", request: existing.request };
    }, { isolationLevel: "read committed" });
  },

  list(actor, status) {
    return getLabDatabase().select(publicRequest).from(purchaseRequests)
      .where(and(scopedTo(actor), status ? eq(purchaseRequests.status, status) : undefined))
      .orderBy(desc(purchaseRequests.createdAt), desc(purchaseRequests.id));
  },

  async find(actor, id) {
    const [record] = await getLabDatabase().select({
      request: publicRequest,
      requesterId: purchaseRequests.requesterId,
    }).from(purchaseRequests).where(and(scopedTo(actor), eq(purchaseRequests.id, id))).limit(1);
    return record;
  },

  decide(actor, id, input) {
    const status = decisionStatuses[input.decision];
    const inTenant = and(scopedTo(actor), eq(purchaseRequests.id, id));
    return getLabDatabase().transaction(async (transaction) => {
      const [request] = await transaction.update(purchaseRequests)
        .set({ status, updatedAt: sql`now()` })
        .where(and(
          inTenant,
          ne(purchaseRequests.requesterId, actor.userId),
          eq(purchaseRequests.status, "PENDING"),
        )).returning(publicRequest);

      if (!request) {
        const [record] = await transaction.select({ requesterId: purchaseRequests.requesterId })
          .from(purchaseRequests).where(inTenant).limit(1);
        if (!record) return { kind: "not-found" };
        if (record.requesterId === actor.userId) return { kind: "forbidden" };
        return { kind: "invalid-transition" };
      }

      await transaction.insert(auditEvents).values({
        tenantId: actor.tenantId,
        requestId: request.id,
        actorId: actor.userId,
        type: status,
        reason: input.reason ?? null,
      });
      return { kind: "decided", request };
    }, { isolationLevel: "read committed" });
  },

  audit(tenantId, requestId) {
    return getLabDatabase().select({
      id: auditEvents.id,
      type: auditEvents.type,
      actorName: users.displayName,
      reason: auditEvents.reason,
      occurredAt: auditEvents.occurredAt,
    }).from(auditEvents).innerJoin(users, eq(users.id, auditEvents.actorId))
      .where(and(eq(auditEvents.tenantId, tenantId), eq(auditEvents.requestId, requestId)))
      .orderBy(auditEvents.occurredAt, auditEvents.id);
  },
};
