import type {
  AuditEvent, PurchaseRequest, PurchaseStatus, PurchaseSubmission, TenantActor,
} from "../domain/procurement";

export type PurchaseRequestRepository = {
  create(
    actor: TenantActor,
    input: PurchaseSubmission,
    key: string,
  ): Promise<PurchaseRequest | undefined>;
  list(actor: TenantActor, status?: PurchaseStatus): Promise<PurchaseRequest[]>;
  find(actor: TenantActor, id: string): Promise<PurchaseRequest | undefined>;
  audit(tenantId: string, requestId: string): Promise<AuditEvent[]>;
};

export function purchaseRequestService(repository: PurchaseRequestRepository) {
  return {
    async create(actor: TenantActor, input: PurchaseSubmission, key: string) {
      if (actor.role !== "REQUESTER") return { kind: "forbidden" } as const;

      const request = await repository.create(actor, input, key);
      return request
        ? { kind: "created", request } as const
        : { kind: "conflict" } as const;
    },

    list: (actor: TenantActor, status?: PurchaseStatus) => repository.list(actor, status),

    find: (actor: TenantActor, id: string) => repository.find(actor, id),

    async audit(actor: TenantActor, requestId: string) {
      if (actor.role === "REQUESTER") return { kind: "forbidden" } as const;

      const request = await repository.find(actor, requestId);
      if (!request) return { kind: "not-found" } as const;

      const events = await repository.audit(actor.tenantId, requestId);
      return { kind: "found", events } as const;
    },
  };
}
