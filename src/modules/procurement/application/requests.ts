import { canApproveAmount, canDecidePurchase } from "../domain/procurement";
import type {
  AuditEvent,
  CostCenter,
  FinancialCommitment,
  PurchaseDecision,
  PurchaseRequest,
  PurchaseStatus,
  PurchaseSubmission,
  TenantActor,
} from "../domain/procurement";

export type SubmissionResult =
  | { kind: "created" | "replayed"; request: PurchaseRequest }
  | { kind: "not-found" }
  | { kind: "conflict" };

export type DecisionOptions = {
  idempotencyKey: string;
  labSyncBarrier?: string;
};

export type DecisionResult =
  | {
      kind: "decided";
      request: PurchaseRequest;
      costCenter: CostCenter;
      commitment: FinancialCommitment | null;
      replayed: boolean;
    }
  | {
      kind:
        | "forbidden"
        | "approval-limit-exceeded"
        | "not-found"
        | "invalid-transition"
        | "insufficient-budget"
        | "idempotency-conflict";
    };

export type PurchaseRequestDetailRecord = {
  request: PurchaseRequest;
  requesterId: string;
  costCenter: CostCenter;
  commitment: FinancialCommitment | null;
};

export type PurchaseRequestRepository = {
  listCostCenters(actor: TenantActor): Promise<CostCenter[]>;
  create(actor: TenantActor, input: PurchaseSubmission, key: string): Promise<SubmissionResult>;
  list(actor: TenantActor, status?: PurchaseStatus): Promise<PurchaseRequest[]>;
  find(actor: TenantActor, id: string): Promise<PurchaseRequestDetailRecord | undefined>;
  decide(actor: TenantActor, id: string, input: PurchaseDecision, options: DecisionOptions): Promise<DecisionResult>;
  audit(tenantId: string, requestId: string): Promise<AuditEvent[]>;
};

export function purchaseRequestService(repository: PurchaseRequestRepository) {
  return {
    listCostCenters: (actor: TenantActor) => repository.listCostCenters(actor),

    async create(actor: TenantActor, input: PurchaseSubmission, key: string) {
      if (actor.role !== "REQUESTER") return { kind: "forbidden" } as const;
      return repository.create(actor, input, key);
    },

    list: (actor: TenantActor, status?: PurchaseStatus) => repository.list(actor, status),

    async find(actor: TenantActor, id: string) {
      return repository.find(actor, id);
    },

    async detail(actor: TenantActor, id: string) {
      const record = await repository.find(actor, id);
      if (!record) return undefined;

      return {
        purchase: record.request,
        costCenter: record.costCenter,
        commitment: record.commitment,
        canDecide: canDecidePurchase(actor, record.requesterId, record.request.status, record.request.amountMinor),
        canApprove: canApproveAmount(actor, record.requesterId, record.request.status, record.request.amountMinor),
      };
    },

    async decide(actor: TenantActor, id: string, input: PurchaseDecision, options: DecisionOptions) {
      if (actor.role !== "APPROVER") return { kind: "forbidden" } as const;
      return repository.decide(actor, id, input, options);
    },

    async audit(actor: TenantActor, requestId: string) {
      if (actor.role === "REQUESTER") return { kind: "forbidden" } as const;

      const request = await repository.find(actor, requestId);
      if (!request) return { kind: "not-found" } as const;

      const events = await repository.audit(actor.tenantId, requestId);
      return { kind: "found", events } as const;
    },
  };
}
