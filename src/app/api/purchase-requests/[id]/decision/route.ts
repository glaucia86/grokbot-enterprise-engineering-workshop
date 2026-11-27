import { z } from "zod";
import { apiError, authenticated, hasSameOrigin, labJson, readJson } from "../../../../../server/http/lab-responses";
import { decisionSchema, keySchema } from "../../../../../server/http/purchase-input";
import { requests } from "../../../../../server/procurement/requests";

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return authenticated(async (actor) => {
    if (actor.role !== "APPROVER" || !hasSameOrigin(request)) return apiError("FORBIDDEN");

    const id = z.uuid().safeParse((await params).id);
    if (!id.success) return apiError("NOT_FOUND");

    const idempotencyKey = keySchema.safeParse(request.headers.get("idempotency-key"));
    if (!idempotencyKey.success) return apiError("INVALID_INPUT");

    const input = decisionSchema.safeParse(await readJson(request));
    if (!input.success) return apiError("INVALID_INPUT");

    const result = await requests.decide(actor, id.data, input.data, {
      idempotencyKey: idempotencyKey.data,
    });

    if (result.kind === "decided") {
      return labJson({
        ...result.request,
        costCenter: result.costCenter,
        commitment: result.commitment,
        replayed: result.replayed,
      });
    }
    if (result.kind === "forbidden") return apiError("FORBIDDEN");
    if (result.kind === "approval-limit-exceeded") return apiError("APPROVAL_LIMIT_EXCEEDED");
    if (result.kind === "not-found") return apiError("NOT_FOUND");
    if (result.kind === "insufficient-budget") return apiError("INSUFFICIENT_BUDGET");
    if (result.kind === "idempotency-conflict") return apiError("IDEMPOTENCY_CONFLICT");
    return apiError("INVALID_TRANSITION");
  });
}
