export const tenantRoles = ["REQUESTER", "APPROVER", "AUDITOR"] as const;
export const purchaseStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;

export type TenantRole = typeof tenantRoles[number];
export type PurchaseStatus = typeof purchaseStatuses[number];
export const decisionStatuses = { APPROVE: "APPROVED", REJECT: "REJECTED" } as const;
export type DecisionStatus = typeof decisionStatuses[keyof typeof decisionStatuses];
export type AuditEventType = "CREATED" | DecisionStatus;

declare const moneyMinorBrand: unique symbol;
export type MoneyMinor = number & { readonly [moneyMinorBrand]: "USD_CENTS" };

export function asMoneyMinor(value: number): MoneyMinor {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("MoneyMinor must be a non-negative safe integer.");
  }
  return value as MoneyMinor;
}

export function asPositiveMoneyMinor(value: number): MoneyMinor {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError("Positive MoneyMinor must be a safe integer >= 1.");
  }
  return value as MoneyMinor;
}

export function computeAvailableBudget(allocatedBudgetMinor: number, committedBudgetMinor: number): number {
  if (!Number.isSafeInteger(allocatedBudgetMinor) || !Number.isSafeInteger(committedBudgetMinor)) {
    throw new RangeError("Budget values must be safe integers.");
  }
  return allocatedBudgetMinor - committedBudgetMinor;
}

export function canCommitAmount(allocatedBudgetMinor: number, committedBudgetMinor: number, amountMinor: number): boolean {
  if (!Number.isSafeInteger(allocatedBudgetMinor) || !Number.isSafeInteger(committedBudgetMinor) || !Number.isSafeInteger(amountMinor)) {
    return false;
  }
  if (amountMinor < 1 || allocatedBudgetMinor < 0 || committedBudgetMinor < 0) return false;
  return committedBudgetMinor <= allocatedBudgetMinor - amountMinor;
}

export function addCommittedAmount(committedBudgetMinor: number, amountMinor: number): MoneyMinor {
  const next = committedBudgetMinor + amountMinor;
  if (!Number.isSafeInteger(next) || next < 0) {
    throw new RangeError("Committed budget overflowed safe integer bounds.");
  }
  return next as MoneyMinor;
}

export type TenantActor = {
  tenantId: string;
  userId: string;
  role: TenantRole;
  approvalLimitMinor: number | null;
};

export type CostCenter = {
  id: string;
  code: string;
  name: string;
  currency: "USD";
  allocatedBudgetMinor: number;
  committedBudgetMinor: number;
  availableBudgetMinor: number;
  updatedAt: Date;
};

export type PurchaseSubmission = {
  costCenterId: string;
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
  costCenterCode: string;
  costCenterName: string;
  status: PurchaseStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type FinancialCommitment = {
  id: string;
  costCenterId: string;
  requestId: string;
  amountMinor: number;
  currency: "USD";
  committedByActorName: string;
  committedAt: Date;
};

export type AuditEvent = {
  id: string;
  type: AuditEventType;
  actorName: string;
  reason: string | null;
  occurredAt: Date;
};

export type ApprovalAuthorityOutcome =
  | { allowed: true }
  | { allowed: false; reason: "forbidden" | "approval-limit-exceeded" };

export function evaluateApprovalAuthority(
  actor: TenantActor,
  requesterId: string,
  amountMinor: number,
  decision: PurchaseDecision["decision"],
): ApprovalAuthorityOutcome {
  if (actor.role !== "APPROVER" || actor.userId === requesterId) {
    return { allowed: false, reason: "forbidden" };
  }
  if (decision === "APPROVE") {
    if (actor.approvalLimitMinor === null || !Number.isSafeInteger(actor.approvalLimitMinor)) {
      return { allowed: false, reason: "approval-limit-exceeded" };
    }
    if (amountMinor > actor.approvalLimitMinor) {
      return { allowed: false, reason: "approval-limit-exceeded" };
    }
  }
  return { allowed: true };
}

export function canTransitionStatus(current: PurchaseStatus, next: DecisionStatus): boolean {
  return current === "PENDING" && (next === "APPROVED" || next === "REJECTED");
}

export function canDecidePurchase(actor: TenantActor, requesterId: string, status: PurchaseStatus): boolean {
  return status === "PENDING" && actor.role === "APPROVER" && actor.userId !== requesterId;
}

export function canApproveAmount(actor: TenantActor, requesterId: string, status: PurchaseStatus, amountMinor: number): boolean {
  if (status !== "PENDING") return false;
  return evaluateApprovalAuthority(actor, requesterId, amountMinor, "APPROVE").allowed;
}

export function canonicalSubmissionPayload(submission: PurchaseSubmission): string {
  return JSON.stringify([
    "purchase-v2",
    submission.costCenterId,
    submission.title,
    submission.justification,
    submission.amountMinor,
    submission.currency,
  ]);
}

export function canonicalDecisionPayload(requestId: string, decision: PurchaseDecision): string {
  return JSON.stringify([
    "decision-v1",
    requestId,
    decision.decision,
    decision.reason ?? null,
  ]);
}
