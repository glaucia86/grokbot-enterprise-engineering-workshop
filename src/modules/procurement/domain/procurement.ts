export const tenantRoles = ["REQUESTER", "APPROVER", "AUDITOR"] as const;
export const purchaseStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export type TenantRole = typeof tenantRoles[number];
export type PurchaseStatus = typeof purchaseStatuses[number];
export type AuditEventType = "CREATED" | Exclude<PurchaseStatus, "PENDING">;

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
  occurredAt: Date;
};
