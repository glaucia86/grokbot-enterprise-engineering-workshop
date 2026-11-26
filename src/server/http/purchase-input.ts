import { z } from "zod";
import { purchaseStatuses } from "../../modules/procurement/domain/procurement";

export const keySchema = z.string().regex(/^[A-Za-z0-9_-]{1,128}$/);
function purchaseText(maxLength: number) {
  return z.string().trim().min(1).max(maxLength)
    .refine((value) => value.isWellFormed() && !value.includes("\0"));
}

export const submissionSchema = z.strictObject({
  costCenterId: z.uuid(),
  title: purchaseText(120),
  justification: purchaseText(2_000),
  amountMinor: z.int().positive(),
  currency: z.literal("USD"),
});
export const statusSchema = z.enum(purchaseStatuses).optional();

const decisionReason = purchaseText(2_000);
export const decisionSchema = z.discriminatedUnion("decision", [
  z.strictObject({ decision: z.literal("APPROVE"), reason: decisionReason.optional() }),
  z.strictObject({ decision: z.literal("REJECT"), reason: decisionReason }),
]);
