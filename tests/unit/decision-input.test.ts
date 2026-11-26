import { describe, expect, it } from "vitest";
import { decisionSchema } from "../../src/server/http/purchase-input";

describe("purchase decision contract", () => {
  it("accepts an approval without a reason", () => {
    expect(decisionSchema.parse({ decision: "APPROVE" })).toEqual({ decision: "APPROVE" });
  });

  it("trims a rejection reason while preserving its text", () => {
    expect(decisionSchema.parse({ decision: "REJECT", reason: "  Budget deferred  " }))
      .toEqual({ decision: "REJECT", reason: "Budget deferred" });
  });

  it.each([
    { decision: "REJECT" },
    { decision: "REJECT", reason: "   " },
    { decision: "REJECT", reason: "x".repeat(2_001) },
    { decision: "REJECT", reason: "a\0b" },
    { decision: "REJECT", reason: String.fromCharCode(0xd800) },
    { decision: "APPROVED" },
    { decision: "APPROVE", actorId: "client-supplied" },
  ])("rejects an invalid decision body", (input) => {
    expect(decisionSchema.safeParse(input).success).toBe(false);
  });
});
