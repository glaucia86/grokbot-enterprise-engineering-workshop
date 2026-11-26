import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getLabDatabase } from "../../../server/db/lab-database";
import { waitForLabSyncBarrier } from "../../../server/db/lab-sync-barrier";
import {
  auditEvents,
  costCenters,
  financialCommitments,
  purchaseRequests,
  users,
} from "../../../server/db/schema";
import { sha256 } from "../../../server/sha256";
import type { PurchaseRequestRepository } from "../application/requests";
import {
  canCommitAmount,
  canonicalSubmissionPayload,
  computeAvailableBudget,
  decisionStatuses,
  evaluateApprovalAuthority,
} from "../domain/procurement";
import type {
  CostCenter,
  FinancialCommitment,
  PurchaseRequest,
  TenantActor,
} from "../domain/procurement";

function mapCostCenter(row: {
  id: string;
  code: string;
  name: string;
  currency: "USD";
  allocatedBudgetMinor: number;
  committedBudgetMinor: number;
  updatedAt: Date;
}): CostCenter {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    currency: row.currency,
    allocatedBudgetMinor: row.allocatedBudgetMinor,
    committedBudgetMinor: row.committedBudgetMinor,
    availableBudgetMinor: computeAvailableBudget(row.allocatedBudgetMinor, row.committedBudgetMinor),
    updatedAt: row.updatedAt,
  };
}

const requestSelection = {
  id: purchaseRequests.id,
  costCenterId: purchaseRequests.costCenterId,
  costCenterCode: costCenters.code,
  costCenterName: costCenters.name,
  title: purchaseRequests.title,
  justification: purchaseRequests.justification,
  amountMinor: purchaseRequests.amountMinor,
  currency: purchaseRequests.currency,
  status: purchaseRequests.status,
  createdAt: purchaseRequests.createdAt,
  updatedAt: purchaseRequests.updatedAt,
};

function scopedTo(actor: TenantActor) {
  return and(
    eq(purchaseRequests.tenantId, actor.tenantId),
    actor.role === "REQUESTER" ? eq(purchaseRequests.requesterId, actor.userId) : undefined,
  );
}

export const postgresRequests: PurchaseRequestRepository = {
  async listCostCenters(actor) {
    const rows = await getLabDatabase()
      .select({
        id: costCenters.id,
        code: costCenters.code,
        name: costCenters.name,
        currency: costCenters.currency,
        allocatedBudgetMinor: costCenters.allocatedBudgetMinor,
        committedBudgetMinor: costCenters.committedBudgetMinor,
        updatedAt: costCenters.updatedAt,
      })
      .from(costCenters)
      .where(eq(costCenters.tenantId, actor.tenantId))
      .orderBy(asc(costCenters.code));
    return rows.map(mapCostCenter);
  },

  async create(actor, input, key) {
    const canonical = canonicalSubmissionPayload(input);
    const requestHash = await sha256(canonical);
    return getLabDatabase().transaction(async (transaction) => {
      const [center] = await transaction
        .select({ id: costCenters.id, code: costCenters.code, name: costCenters.name })
        .from(costCenters)
        .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, input.costCenterId)))
        .limit(1);
      if (!center) return { kind: "not-found" };

      const [inserted] = await transaction
        .insert(purchaseRequests)
        .values({
          ...input,
          tenantId: actor.tenantId,
          requesterId: actor.userId,
          idempotencyKey: key,
          requestHash,
        })
        .onConflictDoNothing({
          target: [purchaseRequests.tenantId, purchaseRequests.idempotencyKey],
        })
        .returning({
          id: purchaseRequests.id,
          costCenterId: purchaseRequests.costCenterId,
          title: purchaseRequests.title,
          justification: purchaseRequests.justification,
          amountMinor: purchaseRequests.amountMinor,
          currency: purchaseRequests.currency,
          status: purchaseRequests.status,
          createdAt: purchaseRequests.createdAt,
          updatedAt: purchaseRequests.updatedAt,
        });

      if (inserted) {
        await transaction.insert(auditEvents).values({
          tenantId: actor.tenantId,
          requestId: inserted.id,
          actorId: actor.userId,
          type: "CREATED",
        });
        const request: PurchaseRequest = {
          ...inserted,
          costCenterCode: center.code,
          costCenterName: center.name,
        };
        return { kind: "created", request };
      }

      const [existing] = await transaction
        .select({
          request: requestSelection,
          requesterId: purchaseRequests.requesterId,
        })
        .from(purchaseRequests)
        .innerJoin(
          costCenters,
          and(eq(costCenters.tenantId, purchaseRequests.tenantId), eq(costCenters.id, purchaseRequests.costCenterId)),
        )
        .where(and(eq(purchaseRequests.tenantId, actor.tenantId), eq(purchaseRequests.idempotencyKey, key)))
        .limit(1);
      if (!existing) throw new Error("The purchase request that owns the idempotency key could not be read.");
      if (existing.requesterId !== actor.userId || canonicalSubmissionPayload(existing.request) !== canonical) {
        return { kind: "conflict" };
      }
      return { kind: "replayed", request: existing.request };
    }, { isolationLevel: "read committed" });
  },

  list(actor, status) {
    return getLabDatabase()
      .select(requestSelection)
      .from(purchaseRequests)
      .innerJoin(
        costCenters,
        and(eq(costCenters.tenantId, purchaseRequests.tenantId), eq(costCenters.id, purchaseRequests.costCenterId)),
      )
      .where(and(scopedTo(actor), status ? eq(purchaseRequests.status, status) : undefined))
      .orderBy(desc(purchaseRequests.createdAt), desc(purchaseRequests.id));
  },

  async find(actor, id) {
    const [row] = await getLabDatabase()
      .select({
        request: requestSelection,
        requesterId: purchaseRequests.requesterId,
        costCenter: {
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          currency: costCenters.currency,
          allocatedBudgetMinor: costCenters.allocatedBudgetMinor,
          committedBudgetMinor: costCenters.committedBudgetMinor,
          updatedAt: costCenters.updatedAt,
        },
      })
      .from(purchaseRequests)
      .innerJoin(
        costCenters,
        and(eq(costCenters.tenantId, purchaseRequests.tenantId), eq(costCenters.id, purchaseRequests.costCenterId)),
      )
      .where(and(scopedTo(actor), eq(purchaseRequests.id, id)))
      .limit(1);
    if (!row) return undefined;

    const [commitmentRow] = await getLabDatabase()
      .select({
        id: financialCommitments.id,
        costCenterId: financialCommitments.costCenterId,
        requestId: financialCommitments.requestId,
        amountMinor: financialCommitments.amountMinor,
        currency: financialCommitments.currency,
        committedByActorName: users.displayName,
        committedAt: financialCommitments.committedAt,
      })
      .from(financialCommitments)
      .innerJoin(users, eq(users.id, financialCommitments.committedByActorId))
      .where(and(eq(financialCommitments.tenantId, actor.tenantId), eq(financialCommitments.requestId, id)))
      .orderBy(desc(financialCommitments.committedAt))
      .limit(1);

    return {
      request: row.request,
      requesterId: row.requesterId,
      costCenter: mapCostCenter(row.costCenter),
      commitment: commitmentRow ?? null,
    };
  },

  async decide(actor, id, input, options) {
    const nextStatus = decisionStatuses[input.decision];

    return getLabDatabase().transaction(async (transaction) => {
      const [record] = await transaction
        .select({
          id: purchaseRequests.id,
          costCenterId: purchaseRequests.costCenterId,
          requesterId: purchaseRequests.requesterId,
          amountMinor: purchaseRequests.amountMinor,
          status: purchaseRequests.status,
          title: purchaseRequests.title,
          justification: purchaseRequests.justification,
          currency: purchaseRequests.currency,
          createdAt: purchaseRequests.createdAt,
        })
        .from(purchaseRequests)
        .where(and(eq(purchaseRequests.tenantId, actor.tenantId), eq(purchaseRequests.id, id)))
        .limit(1);
      if (!record) return { kind: "not-found" };

      const authority = evaluateApprovalAuthority(actor, record.requesterId, record.amountMinor, input.decision);
      if (!authority.allowed) return { kind: authority.reason };
      if (record.status !== "PENDING") return { kind: "invalid-transition" };

      const [center] = await transaction
        .select({
          id: costCenters.id,
          code: costCenters.code,
          name: costCenters.name,
          currency: costCenters.currency,
          allocatedBudgetMinor: costCenters.allocatedBudgetMinor,
          committedBudgetMinor: costCenters.committedBudgetMinor,
          updatedAt: costCenters.updatedAt,
        })
        .from(costCenters)
        .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, record.costCenterId)))
        .limit(1);
      if (!center) return { kind: "not-found" };

      let updatedCenter = center;
      let commitment: FinancialCommitment | null = null;

      if (input.decision === "APPROVE") {
        // Intentional PH-42 starter defect: checks stale budget snapshot without row locking
        // or database CHECK constraints, allowing concurrent approvals to overspend.
        if (!canCommitAmount(center.allocatedBudgetMinor, center.committedBudgetMinor, record.amountMinor)) {
          return { kind: "insufficient-budget" };
        }

        await waitForLabSyncBarrier(options.labSyncBarrier);

        const [nextCenter] = await transaction
          .update(costCenters)
          .set({
            committedBudgetMinor: sql`${costCenters.committedBudgetMinor} + ${record.amountMinor}`,
            updatedAt: sql`now()`,
          })
          .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, center.id)))
          .returning({
            id: costCenters.id,
            code: costCenters.code,
            name: costCenters.name,
            currency: costCenters.currency,
            allocatedBudgetMinor: costCenters.allocatedBudgetMinor,
            committedBudgetMinor: costCenters.committedBudgetMinor,
            updatedAt: costCenters.updatedAt,
          });
        updatedCenter = nextCenter;

        const [insertedCommitment] = await transaction
          .insert(financialCommitments)
          .values({
            tenantId: actor.tenantId,
            costCenterId: center.id,
            requestId: record.id,
            amountMinor: record.amountMinor,
            currency: record.currency,
            committedByActorId: actor.userId,
          })
          .returning({
            id: financialCommitments.id,
            costCenterId: financialCommitments.costCenterId,
            requestId: financialCommitments.requestId,
            amountMinor: financialCommitments.amountMinor,
            currency: financialCommitments.currency,
            committedAt: financialCommitments.committedAt,
          });
        const [actorRow] = await transaction
          .select({ displayName: users.displayName })
          .from(users)
          .where(eq(users.id, actor.userId))
          .limit(1);
        commitment = {
          ...insertedCommitment,
          committedByActorName: actorRow?.displayName ?? "Approver",
        };
      }

      const [updatedRequest] = await transaction
        .update(purchaseRequests)
        .set({ status: nextStatus, updatedAt: sql`now()` })
        .where(and(
          eq(purchaseRequests.tenantId, actor.tenantId),
          eq(purchaseRequests.id, id),
          eq(purchaseRequests.status, "PENDING"),
        ))
        .returning({
          id: purchaseRequests.id,
          costCenterId: purchaseRequests.costCenterId,
          title: purchaseRequests.title,
          justification: purchaseRequests.justification,
          amountMinor: purchaseRequests.amountMinor,
          currency: purchaseRequests.currency,
          status: purchaseRequests.status,
          createdAt: purchaseRequests.createdAt,
          updatedAt: purchaseRequests.updatedAt,
        });
      if (!updatedRequest) return { kind: "invalid-transition" };

      await transaction.insert(auditEvents).values({
        tenantId: actor.tenantId,
        requestId: updatedRequest.id,
        actorId: actor.userId,
        type: nextStatus,
        reason: input.reason ?? null,
      });

      return {
        kind: "decided",
        request: {
          ...updatedRequest,
          costCenterCode: updatedCenter.code,
          costCenterName: updatedCenter.name,
        },
        costCenter: mapCostCenter(updatedCenter),
        commitment,
        replayed: false,
      };
    }, { isolationLevel: "read committed" });
  },

  audit(tenantId, requestId) {
    return getLabDatabase()
      .select({
        id: auditEvents.id,
        type: auditEvents.type,
        actorName: users.displayName,
        reason: auditEvents.reason,
        occurredAt: auditEvents.occurredAt,
      })
      .from(auditEvents)
      .innerJoin(users, eq(users.id, auditEvents.actorId))
      .where(and(eq(auditEvents.tenantId, tenantId), eq(auditEvents.requestId, requestId)))
      .orderBy(auditEvents.occurredAt, auditEvents.id);
  },
};
