import { z } from "zod";
import { decisionSchema } from "../../../../../server/http/purchase-input";
import { apiError, authenticated, hasSameOrigin, labJson, readJson } from "../../../../../server/http/lab-responses";
import { requests } from "../../../../../server/procurement/requests";

export function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return authenticated(async (actor) => {
    if (actor.role !== "APPROVER" || !hasSameOrigin(request)) return apiError("FORBIDDEN");

    const id = z.uuid().safeParse((await params).id);
    if (!id.success) return apiError("NOT_FOUND");

    const input = decisionSchema.safeParse(await readJson(request));
    if (!input.success) return apiError("INVALID_INPUT");

    const result = await requests.decide(actor, id.data, input.data);
    if (result.kind === "decided") return labJson(result.request);
    if (result.kind === "forbidden") return apiError("FORBIDDEN");
    if (result.kind === "not-found") return apiError("NOT_FOUND");
    return apiError("INVALID_TRANSITION");
  });
}
