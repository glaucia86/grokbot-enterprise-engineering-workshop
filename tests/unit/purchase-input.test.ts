import { describe, expect, it } from "bun:test";
import { keySchema, submissionSchema } from "../../src/server/http/purchase-input";

const valid = { title: "  Gloves ", justification: " Replenishment  ", amountMinor: 123, currency: "USD" as const };

describe("purchase submission contract", () => {
  it("trims whitespace while preserving meaningful characters and an exact amount", () => {
    expect(submissionSchema.parse({ ...valid, title: "  20 × Gloves ", amountMinor: Number.MAX_SAFE_INTEGER }))
      .toEqual({ ...valid, title: "20 × Gloves", justification: "Replenishment", amountMinor: Number.MAX_SAFE_INTEGER });
  });

  it.each([0, 3.4, Number.MAX_SAFE_INTEGER + 1, "99"])("rejects invalid minor units (%s)", (amountMinor) => {
    expect(submissionSchema.safeParse({ ...valid, amountMinor }).success).toBe(false);
  });

  it("rejects client-provided authority and non-USD currency", () => {
    expect(submissionSchema.safeParse({ ...valid, tenantId: "injected-tenant" }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, currency: "BRL" }).success).toBe(false);
  });

  it("rejects text the database cannot round trip", () => {
    expect(submissionSchema.safeParse({ ...valid, title: "Gloves" + String.fromCharCode(0) }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, title: String.fromCharCode(0xd800) }).success).toBe(false);
    expect(submissionSchema.safeParse({ ...valid, title: "Gloves 🧤" }).success).toBe(true);
  });

  it("preserves allowed key case and rejects keys outside the documented alphabet and length", () => {
    expect(keySchema.parse("Abcd-123_9")).toBe("Abcd-123_9");
    for (const key of ["", "a b", "❤️", "a".repeat(129)]) {
      expect(keySchema.safeParse(key).success).toBe(false);
    }
  });
});
