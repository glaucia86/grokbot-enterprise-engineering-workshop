import { canDecidePurchase } from "../domain/procurement";
import type {
  AuditEvent, PurchaseDecision, PurchaseRequest, PurchaseStatus, PurchaseSubmission, TenantActor,
} from "../domain/procurement";

type SubmissionResult =
  | { kind: "created" | "replayed"; request: PurchaseRequest }
  | { kind: "conflict" };

type DecisionResult =
  | { kind: "decided"; request: PurchaseRequest }
  | { kind: "forbidden" | "not-found" | "invalid-transition" };

export type PurchaseRequestRepository = {
  create(actor: TenantActor, input: PurchaseSubmission, key: string): Promise<SubmissionResult>;
  list(actor: TenantActor, status?: PurchaseStatus): Promise<PurchaseRequest[]>;
  find(actor: TenantActor, id: string): Promise<{ request: PurchaseRequest; requesterId: string } | undefined>;
  decide(actor: TenantActor, id: string, input: PurchaseDecision): Promise<DecisionResult>;
  audit(tenantId: string, requestId: string): Promise<AuditEvent[]>;
};

export function purchaseRequestService(repository: PurchaseRequestRepository) {
  return {
    async create(actor: TenantActor, input: PurchaseSubmission, key: string) {
      if (actor.role !== "REQUESTER") return { kind: "forbidden" } as const;
      return repository.create(actor, input, key);
    },

    list: (actor: TenantActor, status?: PurchaseStatus) => repository.list(actor, status),

    async find(actor: TenantActor, id: string) {
      return (await repository.find(actor, id))?.request;
    },

    async detail(actor: TenantActor, id: string) {
      const record = await repository.find(actor, id);
      if (!record) return undefined;

      return {
        purchase: record.request,
        canDecide: canDecidePurchase(actor, record.requesterId, record.request.status),
      };
    },

    async decide(actor: TenantActor, id: string, input: PurchaseDecision) {
      if (actor.role !== "APPROVER") return { kind: "forbidden" } as const;
      return repository.decide(actor, id, input);
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
