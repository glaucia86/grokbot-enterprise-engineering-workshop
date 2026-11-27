import type { CostCenter, PurchaseRequest, PurchaseStatus } from "../../modules/procurement/domain/procurement";

export type StatusTotals = Record<PurchaseStatus, { count: number; amountMinor: number }>;

/** Per cost center integrity facts. Aggregates across cost centers can hide a single violation (TC-01). */
export type CenterIntegrity = {
  id: string;
  code: string;
  name: string;
  allocatedMinor: number;
  committedMinor: number;
  approvedMinor: number;
  overAllocationMinor: number;
  reconciliationDeltaMinor: number;
};

/** Derived, display-only aggregates. Every value stays in exact integer minor units. */
export function dashboardMetrics(purchases: PurchaseRequest[], costCenters: CostCenter[], approvalLimitMinor: number | null) {
  const byStatus: StatusTotals = {
    PENDING: { count: 0, amountMinor: 0 },
    APPROVED: { count: 0, amountMinor: 0 },
    REJECTED: { count: 0, amountMinor: 0 },
  };
  const pendingByCenter = new Map<string, number>();
  const approvedByCenter = new Map<string, number>();

  for (const purchase of purchases) {
    byStatus[purchase.status].count += 1;
    byStatus[purchase.status].amountMinor += purchase.amountMinor;
    if (purchase.status === "PENDING") {
      pendingByCenter.set(purchase.costCenterId, (pendingByCenter.get(purchase.costCenterId) ?? 0) + purchase.amountMinor);
    }
    if (purchase.status === "APPROVED") {
      approvedByCenter.set(purchase.costCenterId, (approvedByCenter.get(purchase.costCenterId) ?? 0) + purchase.amountMinor);
    }
  }

  const allocatedMinor = costCenters.reduce((sum, center) => sum + center.allocatedBudgetMinor, 0);
  const committedMinor = costCenters.reduce((sum, center) => sum + center.committedBudgetMinor, 0);
  const availableMinor = allocatedMinor - committedMinor;

  const integrity: CenterIntegrity[] = costCenters.map((center) => {
    const approvedMinor = approvedByCenter.get(center.id) ?? 0;
    return {
      id: center.id,
      code: center.code,
      name: center.name,
      allocatedMinor: center.allocatedBudgetMinor,
      committedMinor: center.committedBudgetMinor,
      approvedMinor,
      overAllocationMinor: Math.max(0, center.committedBudgetMinor - center.allocatedBudgetMinor),
      reconciliationDeltaMinor: center.committedBudgetMinor - approvedMinor,
    };
  });

  const queue = purchases
    .filter((purchase) => purchase.status === "PENDING")
    .toSorted((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const withinLimit = approvalLimitMinor === null ? [] : queue.filter((purchase) => purchase.amountMinor <= approvalLimitMinor);
  const escalate = approvalLimitMinor === null ? [] : queue.filter((purchase) => purchase.amountMinor > approvalLimitMinor);

  return {
    byStatus,
    pendingByCenter,
    allocatedMinor,
    committedMinor,
    availableMinor,
    pendingMinor: byStatus.PENDING.amountMinor,
    overspentCenters: costCenters.filter((center) => center.availableBudgetMinor < 0),
    integrity,
    queue,
    withinLimit,
    escalate,
  };
}

export type DashboardMetrics = ReturnType<typeof dashboardMetrics>;

export type IntegrityStatus =
  | { kind: "over-allocation"; centers: CenterIntegrity[] }
  | { kind: "unreconciled"; centers: CenterIntegrity[] }
  | { kind: "clear" };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * Both INV-01 clauses, evaluated per cost center: committed within allocation, and committed equal to
 * the approved requests. Reconciliation is only meaningful for roles that see every tenant request.
 */
export function integrityStatus(metrics: DashboardMetrics): IntegrityStatus {
  const overAllocated = metrics.integrity.filter((center) => center.overAllocationMinor > 0);
  if (overAllocated.length) return { kind: "over-allocation", centers: overAllocated };
  const unreconciled = metrics.integrity.filter((center) => center.reconciliationDeltaMinor !== 0);
  return unreconciled.length ? { kind: "unreconciled", centers: unreconciled } : { kind: "clear" };
}

/** Tone for the tenant-wide available figure: any over-allocated cost center makes it a warning. */
export function availabilitySignal(metrics: DashboardMetrics): { tone: "danger" | "neutral"; note: string } {
  const overAllocated = metrics.integrity.filter((center) => center.overAllocationMinor > 0).length;
  return overAllocated
    ? { tone: "danger", note: `${plural(overAllocated, "cost center")} over allocation` }
    : { tone: "neutral", note: `Across ${plural(metrics.integrity.length, "cost center")}` };
}
