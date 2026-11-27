import { expect, test } from "vitest";
import fc from "fast-check";
import {
  addCommittedAmount,
  canCommitAmount,
  canTransitionStatus,
  computeAvailableBudget,
  decisionStatuses,
  evaluateApprovalAuthority,
  tenantRoles,
  type PurchaseStatus,
} from "../../src/modules/procurement/domain/procurement";
import { keySchema, submissionSchema } from "../../src/server/http/purchase-input";

const seed = Number(process.env.PH42_PROPERTY_SEED ?? "4207");
if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647) {
  throw new Error("Use a signed 32-bit property seed.");
}
const numRuns = 200;
const options = { seed, numRuns };

const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";

const text = fc.array(fc.constantFrom("A", "z", "9", "é", "ø", "事", "-", " "), { minLength: 1, maxLength: 20 })
  .map((parts) => ("Request " + parts.join("")).trimEnd());
const padding = fc.array(fc.constantFrom(" ", "\t", "\n", "\u00a0"), { maxLength: 4 }).map((parts) => parts.join(""));
const requestKey = fc.array(fc.constantFrom("A", "a", "Z", "z", "0", "9", "_", "-"), { minLength: 1, maxLength: 128 })
  .map((parts) => parts.join(""));

test("presentation-only changes across retries preserve normalized submission and key", () => {
  fc.assert(fc.property(
    fc.record({
      costCenterId: fc.constant(CC_ENG_01_ID),
      title: text,
      justification: text,
      amountMinor: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
      currency: fc.constant("USD" as const),
    }),
    requestKey,
    fc.array(fc.tuple(padding, padding, padding, padding), { minLength: 2, maxLength: 8 }),
    (canonical, key, retries) => {
      for (const [titleBefore, titleAfter, reasonBefore, reasonAfter] of retries) {
        const normalized = submissionSchema.parse({
          ...canonical,
          title: titleBefore + canonical.title + titleAfter,
          justification: reasonBefore + canonical.justification + reasonAfter,
        });
        expect(normalized).toEqual(canonical);
        expect(submissionSchema.parse(normalized)).toEqual(normalized);
        expect(keySchema.parse(key)).toBe(key);
      }
    },
  ), options);
  console.log(JSON.stringify({ property: "normalized-retries", seed, cases: numRuns }));
});

test("approval sequence model preserves INV-01, INV-02, INV-03, INV-06, INV-07, INV-08 across arbitrary budgets, amounts, retries, and tenants", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 5_000_000 }),
    fc.array(
      fc.record({
        requestId: fc.constantFrom("r1", "r2", "r3", "r4"),
        tenantId: fc.constantFrom("tenant-a", "tenant-b"),
        requesterId: fc.constantFrom("u-req-1", "u-req-2"),
        amountMinor: fc.integer({ min: 1, max: 2_000_000 }),
      }),
      { minLength: 1, maxLength: 4 },
    ),
    fc.array(
      fc.record({
        targetIndex: fc.integer({ min: 0, max: 3 }),
        actorTenantId: fc.constantFrom("tenant-a", "tenant-b"),
        actorId: fc.constantFrom("u-req-1", "u-appr-1", "u-appr-2", "u-junior", "u-audit"),
        role: fc.constantFrom(...tenantRoles),
        approvalLimitMinor: fc.constantFrom(null, 500_000, 2_500_000),
        decision: fc.constantFrom("APPROVE" as const, "REJECT" as const),
        key: fc.constantFrom("k1", "k2", "k3", "k4", "k5"),
      }),
      { minLength: 1, maxLength: 20 },
    ),
    (allocatedBudgetMinor, rawRequests, operations) => {
      const requests = rawRequests.map((req, idx) => ({
        ...req,
        id: `req-${idx}`,
        status: "PENDING" as PurchaseStatus,
        auditCount: 0,
        commitmentCount: 0,
      }));
      const committedByTenant = new Map<string, number>([
        ["tenant-a", 0],
        ["tenant-b", 0],
      ]);
      const idempotency = new Map<string, { actorId: string; requestId: string; decision: string }>();

      for (const op of operations) {
        const req = requests[op.targetIndex % requests.length];
        if (req.tenantId !== op.actorTenantId) continue;

        const scopeKey = `${op.actorTenantId}:${op.key}`;
        const existingKey = idempotency.get(scopeKey);
        const actor = {
          tenantId: op.actorTenantId,
          userId: op.actorId,
          role: op.role,
          approvalLimitMinor: op.approvalLimitMinor,
        };
        const auth = evaluateApprovalAuthority(actor, req.requesterId, req.amountMinor, op.decision);

        if (existingKey) {
          if (existingKey.actorId !== op.actorId || existingKey.requestId !== req.id || existingKey.decision !== op.decision) {
            continue;
          }
          if (!auth.allowed) continue;
          continue;
        }

        if (!auth.allowed) continue;
        const nextStatus = decisionStatuses[op.decision];
        if (!canTransitionStatus(req.status, nextStatus)) continue;

        const currentCommitted = committedByTenant.get(req.tenantId) ?? 0;
        if (op.decision === "APPROVE") {
          if (!canCommitAmount(allocatedBudgetMinor, currentCommitted, req.amountMinor)) continue;
          committedByTenant.set(req.tenantId, addCommittedAmount(currentCommitted, req.amountMinor));
          req.commitmentCount += 1;
        }
        req.status = nextStatus;
        req.auditCount += 1;
        idempotency.set(scopeKey, { actorId: op.actorId, requestId: req.id, decision: op.decision });
      }

      for (const tenant of ["tenant-a", "tenant-b"]) {
        const committed = committedByTenant.get(tenant) ?? 0;
        const tenantApprovedSum = requests
          .filter((r) => r.tenantId === tenant && r.status === "APPROVED")
          .reduce((acc, r) => acc + r.amountMinor, 0);
        expect(committed).toBe(tenantApprovedSum);
        expect(committed).toBeLessThanOrEqual(allocatedBudgetMinor);
        expect(computeAvailableBudget(allocatedBudgetMinor, committed)).toBeGreaterThanOrEqual(0);
      }
      for (const req of requests) {
        if (req.status === "PENDING") {
          expect(req.auditCount).toBe(0);
          expect(req.commitmentCount).toBe(0);
        } else if (req.status === "APPROVED") {
          expect(req.auditCount).toBe(1);
          expect(req.commitmentCount).toBe(1);
        } else {
          expect(req.auditCount).toBe(1);
          expect(req.commitmentCount).toBe(0);
        }
      }
    },
  ), options);
  console.log(JSON.stringify({ property: "approval-budget-state-machine", seed, cases: numRuns }));
});
