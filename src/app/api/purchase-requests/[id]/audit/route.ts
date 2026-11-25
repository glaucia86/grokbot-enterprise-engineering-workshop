import { z } from "zod";
import { apiError, authenticated, labJson } from "../../../../../server/http/lab-responses";
import { requests } from "../../../../../server/procurement/requests";

export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return authenticated(async (actor) => {
    const id = z.uuid().safeParse((await params).id);
    if (!id.success) return apiError("NOT_FOUND");

    const result = await requests.audit(actor, id.data);
    if (result.kind === "forbidden") return apiError("FORBIDDEN");
    return result.kind === "found" ? labJson({ events: result.events }) : apiError("NOT_FOUND");
  });
}
