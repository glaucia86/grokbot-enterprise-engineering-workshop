import type { CostCenter, PurchaseRequest, PurchaseStatus } from "../../modules/procurement/domain/procurement";

export type StatusTotals = Record<PurchaseStatus, { count: number; amountMinor: number }>;

/** Derived, display-only aggregates. Every value stays in exact integer minor units. */
export function dashboardMetrics(purchases: PurchaseRequest[], costCenters: CostCenter[], approvalLimitMinor: number | null) {
  const byStatus: StatusTotals = {
    PENDING: { count: 0, amountMinor: 0 },
    APPROVED: { count: 0, amountMinor: 0 },
    REJECTED: { count: 0, amountMinor: 0 },
  };
  const pendingByCenter = new Map<string, number>();

  for (const purchase of purchases) {
    byStatus[purchase.status].count += 1;
    byStatus[purchase.status].amountMinor += purchase.amountMinor;
    if (purchase.status === "PENDING") {
      pendingByCenter.set(purchase.costCenterId, (pendingByCenter.get(purchase.costCenterId) ?? 0) + purchase.amountMinor);
    }
  }

  const allocatedMinor = costCenters.reduce((sum, center) => sum + center.allocatedBudgetMinor, 0);
  const committedMinor = costCenters.reduce((sum, center) => sum + center.committedBudgetMinor, 0);
  const availableMinor = allocatedMinor - committedMinor;

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
    headroomAfterPendingMinor: availableMinor - byStatus.PENDING.amountMinor,
    overspentCenters: costCenters.filter((center) => center.availableBudgetMinor < 0),
    queue,
    withinLimit,
    escalate,
    reconciliationDeltaMinor: committedMinor - byStatus.APPROVED.amountMinor,
  };
}

export type DashboardMetrics = ReturnType<typeof dashboardMetrics>;
