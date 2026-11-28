import { describe, expect, it } from "vitest";
import type { CostCenter, PurchaseRequest, PurchaseStatus } from "../../src/modules/procurement/domain/procurement";
import { availabilitySignal, dashboardMetrics, integrityStatus } from "../../src/app/_components/dashboard-metrics";

function center(code: string, allocatedBudgetMinor: number, committedBudgetMinor: number): CostCenter {
  return {
    id: "cc-" + code,
    code,
    name: code + " budget",
    currency: "USD",
    allocatedBudgetMinor,
    committedBudgetMinor,
    availableBudgetMinor: allocatedBudgetMinor - committedBudgetMinor,
    updatedAt: new Date(0),
  };
}

function request(id: string, costCenter: CostCenter, amountMinor: number, status: PurchaseStatus): PurchaseRequest {
  return {
    id,
    costCenterId: costCenter.id,
    costCenterCode: costCenter.code,
    costCenterName: costCenter.name,
    title: id,
    justification: "Synthetic fixture",
    amountMinor,
    currency: "USD",
    status,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

describe("dashboard integrity signals (TC-01, TC-02)", () => {
  it("reports the PH-42 overspend even when the tenant-wide total still looks positive", () => {
    const engineering = center("CC-ENG-01", 1_000_000, 1_400_000);
    const operations = center("CC-OPS-01", 2_500_000, 0);
    const metrics = dashboardMetrics(
      [request("a", engineering, 700_000, "APPROVED"), request("b", engineering, 700_000, "APPROVED")],
      [engineering, operations],
      null,
    );

    expect(metrics.availableMinor).toBe(2_100_000);
    expect(availabilitySignal(metrics)).toEqual({ tone: "danger", note: "1 cost center over allocation" });

    const status = integrityStatus(metrics);
    expect(status.kind).toBe("over-allocation");
    expect(status.kind === "over-allocation" && status.centers.map((c) => [c.code, c.overAllocationMinor])).toEqual([["CC-ENG-01", 400_000]]);
    expect(metrics.integrity.find((c) => c.code === "CC-ENG-01")?.reconciliationDeltaMinor).toBe(0);
  });

  it("does not let reconciliation errors in different cost centers cancel each other out", () => {
    const engineering = center("CC-ENG-01", 1_000_000, 300_000);
    const operations = center("CC-OPS-01", 2_500_000, 100_000);
    const metrics = dashboardMetrics(
      [request("a", engineering, 200_000, "APPROVED"), request("b", operations, 200_000, "APPROVED")],
      [engineering, operations],
      null,
    );

    const status = integrityStatus(metrics);
    expect(status.kind).toBe("unreconciled");
    expect(status.kind === "unreconciled" && status.centers.map((c) => [c.code, c.reconciliationDeltaMinor])).toEqual([
      ["CC-ENG-01", 100_000],
      ["CC-OPS-01", -100_000],
    ]);
  });

  it("states neutral facts when every cost center is within allocation and reconciled", () => {
    const engineering = center("CC-ENG-01", 1_000_000, 700_000);
    const operations = center("CC-OPS-01", 2_500_000, 0);
    const metrics = dashboardMetrics(
      [
        request("approved", engineering, 700_000, "APPROVED"),
        request("pending", engineering, 700_000, "PENDING"),
        request("rejected", operations, 50_000, "REJECTED"),
      ],
      [engineering, operations],
      null,
    );

    expect(integrityStatus(metrics)).toEqual({ kind: "clear" });
    expect(availabilitySignal(metrics)).toEqual({ tone: "neutral", note: "Across 2 cost centers" });
    expect(metrics.integrity.map((c) => [c.code, c.approvedMinor, c.overAllocationMinor])).toEqual([
      ["CC-ENG-01", 700_000, 0],
      ["CC-OPS-01", 0, 0],
    ]);
  });
});
