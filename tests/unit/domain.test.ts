import { describe, expect, it } from "vitest";
import {
  addCommittedAmount,
  asMoneyMinor,
  asPositiveMoneyMinor,
  canCommitAmount,
  canTransitionStatus,
  canonicalDecisionPayload,
  canonicalSubmissionPayload,
  computeAvailableBudget,
  evaluateApprovalAuthority,
  type TenantActor,
} from "../../src/modules/procurement/domain/procurement";

const seniorApprover: TenantActor = {
  tenantId: "t-1",
  userId: "u-approver",
  role: "APPROVER",
  approvalLimitMinor: 2_500_000,
};

const juniorApprover: TenantActor = {
  tenantId: "t-1",
  userId: "u-junior",
  role: "APPROVER",
  approvalLimitMinor: 500_000,
};

describe("exact minor-unit monetary invariants (INV-01, INV-02)", () => {
  it("validates safe integer bounds and rejects floats or negatives", () => {
    expect(asMoneyMinor(0)).toBe(0);
    expect(asPositiveMoneyMinor(700_000)).toBe(700_000);
    expect(() => asMoneyMinor(-1)).toThrow(RangeError);
    expect(() => asMoneyMinor(12.5)).toThrow(RangeError);
    expect(() => asPositiveMoneyMinor(0)).toThrow(RangeError);
  });

  it("evaluates available budget and commitment capacity cleanly", () => {
    expect(computeAvailableBudget(1_000_000, 700_000)).toBe(300_000);
    expect(canCommitAmount(1_000_000, 0, 700_000)).toBe(true);
    expect(canCommitAmount(1_000_000, 700_000, 300_000)).toBe(true);
    expect(canCommitAmount(1_000_000, 700_000, 700_000)).toBe(false);
    expect(canCommitAmount(1_000_000, 0, 0)).toBe(false);
    expect(addCommittedAmount(300_000, 700_000)).toBe(1_000_000);
  });
});

describe("approval authorization policy (INV-06)", () => {
  it("permits an approver within their monetary limit on another user's request", () => {
    expect(evaluateApprovalAuthority(seniorApprover, "u-requester", 700_000, "APPROVE")).toEqual({ allowed: true });
  });

  it("denies self-approval and non-approver roles", () => {
    expect(evaluateApprovalAuthority(seniorApprover, "u-approver", 700_000, "APPROVE")).toEqual({
      allowed: false,
      reason: "forbidden",
    });
    expect(
      evaluateApprovalAuthority(
        { tenantId: "t-1", userId: "u-auditor", role: "AUDITOR", approvalLimitMinor: null },
        "u-requester",
        700_000,
        "APPROVE",
      ),
    ).toEqual({ allowed: false, reason: "forbidden" });
  });

  it("denies approvals exceeding approvalLimitMinor while still allowing rejections", () => {
    expect(evaluateApprovalAuthority(juniorApprover, "u-requester", 700_000, "APPROVE")).toEqual({
      allowed: false,
      reason: "approval-limit-exceeded",
    });
    expect(evaluateApprovalAuthority(juniorApprover, "u-requester", 500_000, "APPROVE")).toEqual({ allowed: true });
    expect(evaluateApprovalAuthority(juniorApprover, "u-requester", 700_000, "REJECT")).toEqual({ allowed: true });
  });
});

describe("state machine and canonical payload fingerprints (INV-04, INV-07)", () => {
  it("allows transitions only from PENDING", () => {
    expect(canTransitionStatus("PENDING", "APPROVED")).toBe(true);
    expect(canTransitionStatus("PENDING", "REJECTED")).toBe(true);
    expect(canTransitionStatus("APPROVED", "REJECTED")).toBe(false);
    expect(canTransitionStatus("APPROVED", "APPROVED")).toBe(false);
    expect(canTransitionStatus("REJECTED", "APPROVED")).toBe(false);
  });

  it("distinguishes canonical submission and decision payloads deterministically", () => {
    const subA = canonicalSubmissionPayload({
      costCenterId: "30000000-0000-4000-8000-000000000001",
      title: "Audit Tooling",
      justification: "Security",
      amountMinor: 700_000,
      currency: "USD",
    });
    const subB = canonicalSubmissionPayload({
      costCenterId: "30000000-0000-4000-8000-000000000002",
      title: "Audit Tooling",
      justification: "Security",
      amountMinor: 700_000,
      currency: "USD",
    });
    expect(subA).not.toBe(subB);

    expect(canonicalDecisionPayload("req-1", { decision: "APPROVE" })).toBe(
      canonicalDecisionPayload("req-1", { decision: "APPROVE", reason: undefined }),
    );
    expect(canonicalDecisionPayload("req-1", { decision: "APPROVE" })).not.toBe(
      canonicalDecisionPayload("req-2", { decision: "APPROVE" }),
    );
    expect(canonicalDecisionPayload("req-1", { decision: "APPROVE" })).not.toBe(
      canonicalDecisionPayload("req-1", { decision: "REJECT", reason: "No budget" }),
    );
  });
});
