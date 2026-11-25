import { createHash } from "node:crypto";
import { and, desc, eq, getTableColumns } from "drizzle-orm";
import { getLabDatabase } from "../../../server/db/lab-database";
import { auditEvents, purchaseRequests, users } from "../../../server/db/schema";
import type { PurchaseRequestRepository } from "../application/requests";
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

function fingerprint({ title, justification, amountMinor, currency }: PurchaseSubmission) {
  const tuple = JSON.stringify(["purchase-v1", title, justification, amountMinor, currency]);
  return createHash("sha256").update(tuple).digest("hex");
}

export const postgresRequests: PurchaseRequestRepository = {
  create(actor, input, key) {
    return getLabDatabase().transaction(async (transaction) => {
      const [request] = await transaction.insert(purchaseRequests).values({
        ...input,
        tenantId: actor.tenantId,
        requesterId: actor.userId,
        idempotencyKey: key,
        requestHash: fingerprint(input),
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
      }
      return request;
    });
  },

  list(actor, status) {
    return getLabDatabase().select(publicRequest).from(purchaseRequests)
      .where(and(scopedTo(actor), status ? eq(purchaseRequests.status, status) : undefined))
      .orderBy(desc(purchaseRequests.createdAt), desc(purchaseRequests.id));
  },

  async find(actor, id) {
    const [request] = await getLabDatabase().select(publicRequest).from(purchaseRequests)
      .where(and(scopedTo(actor), eq(purchaseRequests.id, id))).limit(1);
    return request;
  },

  audit(tenantId, requestId) {
    return getLabDatabase().select({
      id: auditEvents.id,
      type: auditEvents.type,
      actorName: users.displayName,
      occurredAt: auditEvents.occurredAt,
    }).from(auditEvents).innerJoin(users, eq(users.id, auditEvents.actorId))
      .where(and(eq(auditEvents.tenantId, tenantId), eq(auditEvents.requestId, requestId)))
      .orderBy(auditEvents.occurredAt, auditEvents.id);
  },
};
