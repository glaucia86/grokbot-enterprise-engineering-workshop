import { expect, test } from "bun:test";
import fc from "fast-check";
import {
  canDecidePurchase, decisionStatuses, tenantRoles, type PurchaseStatus,
} from "../../src/modules/procurement/domain/procurement";
import { keySchema, submissionSchema } from "../../src/server/http/purchase-input";

const seed = Number(Bun.env.PH42_PROPERTY_SEED ?? "4207");
if (!Number.isInteger(seed) || seed < -2147483648 || seed > 2147483647) throw new Error("Use a signed 32-bit property seed.");
const numRuns = 200;
const options = { seed, numRuns };

const text = fc.array(fc.constantFrom("A", "z", "9", "é", "ø", "事", "🏷️", "-", " "), { minLength: 1, maxLength: 20 })
  .map((parts) => ("Request " + parts.join("")).trimEnd());
const padding = fc.array(fc.constantFrom(" ", "\t", "\n", "\u00a0"), { maxLength: 4 }).map((parts) => parts.join(""));
const requestKey = fc.array(fc.constantFrom("A", "a", "Z", "z", "0", "9", "_", "-"), { minLength: 1, maxLength: 128 })
  .map((parts) => parts.join(""));

test("presentation-only changes across retries preserve the normalized request and key", () => {
  fc.assert(fc.property(
    fc.record({ title: text, justification: text, amountMinor: fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }), currency: fc.constant("USD" as const) }),
    requestKey,
    fc.array(fc.tuple(padding, padding, padding, padding), { minLength: 2, maxLength: 12 }),
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

test("at most the first eligible approval operation changes a pending request", () => {
  fc.assert(fc.property(
    fc.array(fc.record({
      role: fc.constantFrom(...tenantRoles),
      requester: fc.boolean(),
      decision: fc.constantFrom("APPROVE" as const, "REJECT" as const),
    }), { minLength: 1, maxLength: 12 }),
    (operations) => {
      const firstEligible = operations.findIndex(({ role, requester }) => role === "APPROVER" && !requester);
      const accepted: number[] = [];
      let status: PurchaseStatus = "PENDING";
      for (const [index, operation] of operations.entries()) {
        const actor = { tenantId: "tenant-a", userId: operation.requester ? "owner" : "peer", role: operation.role };
        if (canDecidePurchase(actor, "owner", status)) {
          status = decisionStatuses[operation.decision];
          accepted.push(index);
        }
      }
      expect(accepted).toEqual(firstEligible === -1 ? [] : [firstEligible]);
      expect(status).toBe(firstEligible === -1 ? "PENDING" : decisionStatuses[operations[firstEligible].decision]);
    },
  ), options);
  console.log(JSON.stringify({ property: "decision-sequence", seed, cases: numRuns }));
});
