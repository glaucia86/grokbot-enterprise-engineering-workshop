export const tenantRoles = ["REQUESTER", "APPROVER", "AUDITOR"] as const;
export const purchaseStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export type TenantRole = typeof tenantRoles[number];
export type PurchaseStatus = typeof purchaseStatuses[number];
export const decisionStatuses = { APPROVE: "APPROVED", REJECT: "REJECTED" } as const;
export type DecisionStatus = typeof decisionStatuses[keyof typeof decisionStatuses];
export type AuditEventType = "CREATED" | DecisionStatus;

export type TenantActor = {
  tenantId: string;
  userId: string;
  role: TenantRole;
};

export type PurchaseSubmission = {
  title: string;
  justification: string;
  amountMinor: number;
  currency: "USD";
};

export type PurchaseDecision =
  | { decision: "APPROVE"; reason?: string }
  | { decision: "REJECT"; reason: string };

export type PurchaseRequest = PurchaseSubmission & {
  id: string;
  status: PurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  actorName: string;
  reason: string | null;
  occurredAt: Date;
};

export function canDecidePurchase(actor: TenantActor, requesterId: string, status: PurchaseStatus) {
  return actor.role === "APPROVER" && actor.userId !== requesterId && status === "PENDING";
}
