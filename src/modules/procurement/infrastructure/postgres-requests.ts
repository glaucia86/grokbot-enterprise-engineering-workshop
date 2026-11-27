import { and, asc, desc, eq, sql } from "drizzle-orm";
import { getLabDatabase } from "../../../server/db/lab-database";
import {
  auditEvents,
  costCenters,
  decisionIdempotencyKeys,
  financialCommitments,
  purchaseRequests,
  users,
} from "../../../server/db/schema";
import { sha256 } from "../../../server/sha256";
import type { DecisionResult, PurchaseRequestRepository } from "../application/requests";
import {
  canCommitAmount,
  canonicalDecisionPayload,
  canonicalSubmissionPayload,
  computeAvailableBudget,
  decisionStatuses,
  evaluateApprovalAuthority,
} from "../domain/procurement";
import type {
  CostCenter,
  FinancialCommitment,
  PurchaseDecision,
  PurchaseRequest,
  TenantActor,
} from "../domain/procurement";

class RollbackDecision extends Error {
  constructor(readonly result: DecisionResult) {
    super("Rollback decision transaction");
  }
}

type CostCenterRow = {
  id: string;
  code: string;
  name: string;
  currency: "USD";
  allocatedBudgetMinor: number;
  committedBudgetMinor: number;
  updatedAt: Date;
};

function mapCostCenter(row: CostCenterRow): CostCenter {
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

const costCenterSelection = {
  id: costCenters.id,
  code: costCenters.code,
  name: costCenters.name,
  currency: costCenters.currency,
  allocatedBudgetMinor: costCenters.allocatedBudgetMinor,
  committedBudgetMinor: costCenters.committedBudgetMinor,
  updatedAt: costCenters.updatedAt,
};

function scopedTo(actor: TenantActor) {
  return and(
    eq(purchaseRequests.tenantId, actor.tenantId),
    actor.role === "REQUESTER" ? eq(purchaseRequests.requesterId, actor.userId) : undefined,
  );
}

type TransactionDb = Parameters<Parameters<ReturnType<typeof getLabDatabase>["transaction"]>[0]>[0];

async function resolveIdempotentReplay(
  transaction: TransactionDb,
  actor: TenantActor,
  id: string,
  input: PurchaseDecision,
  existingKey: {
    actorId: string;
    requestId: string;
    decision: PurchaseDecision["decision"];
    reason: string | null;
  },
): Promise<DecisionResult> {
  if (
    existingKey.actorId !== actor.userId ||
    existingKey.requestId !== id ||
    existingKey.decision !== input.decision ||
    (existingKey.reason ?? null) !== (input.reason ?? null)
  ) {
    return { kind: "idempotency-conflict" };
  }

  const [row] = await transaction
    .select({
      request: requestSelection,
      requesterId: purchaseRequests.requesterId,
      costCenter: costCenterSelection,
    })
    .from(purchaseRequests)
    .innerJoin(
      costCenters,
      and(eq(costCenters.tenantId, purchaseRequests.tenantId), eq(costCenters.id, purchaseRequests.costCenterId)),
    )
    .where(and(eq(purchaseRequests.tenantId, actor.tenantId), eq(purchaseRequests.id, id)))
    .limit(1);
  if (!row) return { kind: "not-found" };

  // INV-06: Always re-verify active authorization before returning an idempotent replay.
  const authority = evaluateApprovalAuthority(actor, row.requesterId, row.request.amountMinor, input.decision);
  if (!authority.allowed) return { kind: authority.reason };

  const [commitmentRow] = await transaction
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
    .limit(1);

  return {
    kind: "decided",
    request: row.request,
    costCenter: mapCostCenter(row.costCenter),
    commitment: commitmentRow ?? null,
    replayed: true,
  };
}

export const postgresRequests: PurchaseRequestRepository = {
  async listCostCenters(actor) {
    const rows = await getLabDatabase()
      .select(costCenterSelection)
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
        costCenter: costCenterSelection,
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
    const requestHash = await sha256(canonicalDecisionPayload(id, input));

    try {
      return await getLabDatabase().transaction(async (transaction) => {
        const [existingKey] = await transaction
          .select({
            actorId: decisionIdempotencyKeys.actorId,
            requestId: decisionIdempotencyKeys.requestId,
            decision: decisionIdempotencyKeys.decision,
            reason: decisionIdempotencyKeys.reason,
          })
          .from(decisionIdempotencyKeys)
          .where(and(
            eq(decisionIdempotencyKeys.tenantId, actor.tenantId),
            eq(decisionIdempotencyKeys.idempotencyKey, options.idempotencyKey),
          ))
          .limit(1);

        if (existingKey) {
          return resolveIdempotentReplay(transaction, actor, id, input, existingKey);
        }

        const [precheck] = await transaction
          .select({
            id: purchaseRequests.id,
            costCenterId: purchaseRequests.costCenterId,
            requesterId: purchaseRequests.requesterId,
            amountMinor: purchaseRequests.amountMinor,
          })
          .from(purchaseRequests)
          .where(and(eq(purchaseRequests.tenantId, actor.tenantId), eq(purchaseRequests.id, id)))
          .limit(1);
        if (!precheck) return { kind: "not-found" };

        const authority = evaluateApprovalAuthority(actor, precheck.requesterId, precheck.amountMinor, input.decision);
        if (!authority.allowed) return { kind: authority.reason };

        // Lock cost_centers BEFORE purchase_requests for deterministic deadlock-free ordering.
        let lockedCenter: CostCenterRow;

        if (input.decision === "APPROVE") {
          const [center] = await transaction
            .select(costCenterSelection)
            .from(costCenters)
            .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, precheck.costCenterId)))
            .for("update")
            .limit(1);
          if (!center) return { kind: "not-found" };
          lockedCenter = center;
        } else {
          const [center] = await transaction
            .select(costCenterSelection)
            .from(costCenters)
            .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, precheck.costCenterId)))
            .limit(1);
          if (!center) return { kind: "not-found" };
          lockedCenter = center;
        }

        const [lockedRequest] = await transaction
          .select({
            id: purchaseRequests.id,
            costCenterId: purchaseRequests.costCenterId,
            requesterId: purchaseRequests.requesterId,
            amountMinor: purchaseRequests.amountMinor,
            status: purchaseRequests.status,
            currency: purchaseRequests.currency,
          })
          .from(purchaseRequests)
          .where(and(eq(purchaseRequests.tenantId, actor.tenantId), eq(purchaseRequests.id, id)))
          .for("update")
          .limit(1);
        if (!lockedRequest) return { kind: "not-found" };

        const [reservedKey] = await transaction
          .insert(decisionIdempotencyKeys)
          .values({
            tenantId: actor.tenantId,
            idempotencyKey: options.idempotencyKey,
            actorId: actor.userId,
            requestId: id,
            decision: input.decision,
            reason: input.reason ?? null,
            requestHash,
            responseStatus: 200,
          })
          .onConflictDoNothing({
            target: [decisionIdempotencyKeys.tenantId, decisionIdempotencyKeys.idempotencyKey],
          })
          .returning({ idempotencyKey: decisionIdempotencyKeys.idempotencyKey });

        if (!reservedKey) {
          const [winnerKey] = await transaction
            .select({
              actorId: decisionIdempotencyKeys.actorId,
              requestId: decisionIdempotencyKeys.requestId,
              decision: decisionIdempotencyKeys.decision,
              reason: decisionIdempotencyKeys.reason,
            })
            .from(decisionIdempotencyKeys)
            .where(and(
              eq(decisionIdempotencyKeys.tenantId, actor.tenantId),
              eq(decisionIdempotencyKeys.idempotencyKey, options.idempotencyKey),
            ))
            .limit(1);
          if (!winnerKey) {
            throw new Error("The winning decision idempotency key could not be read.");
          }
          return resolveIdempotentReplay(transaction, actor, id, input, winnerKey);
        }

        if (lockedRequest.status !== "PENDING") {
          throw new RollbackDecision({ kind: "invalid-transition" });
        }

        let updatedCenter = lockedCenter;
        let commitment: FinancialCommitment | null = null;

        if (input.decision === "APPROVE") {
          if (!canCommitAmount(lockedCenter.allocatedBudgetMinor, lockedCenter.committedBudgetMinor, lockedRequest.amountMinor)) {
            throw new RollbackDecision({ kind: "insufficient-budget" });
          }

          const [nextCenter] = await transaction
            .update(costCenters)
            .set({
              committedBudgetMinor: sql`${costCenters.committedBudgetMinor} + ${lockedRequest.amountMinor}`,
              updatedAt: sql`now()`,
            })
            .where(and(eq(costCenters.tenantId, actor.tenantId), eq(costCenters.id, lockedCenter.id)))
            .returning(costCenterSelection);
          updatedCenter = nextCenter;

          const [insertedCommitment] = await transaction
            .insert(financialCommitments)
            .values({
              tenantId: actor.tenantId,
              costCenterId: lockedCenter.id,
              requestId: lockedRequest.id,
              amountMinor: lockedRequest.amountMinor,
              currency: lockedRequest.currency,
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
        if (!updatedRequest) {
          throw new RollbackDecision({ kind: "invalid-transition" });
        }

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
    } catch (error) {
      if (error instanceof RollbackDecision) return error.result;
      throw error;
    }
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
