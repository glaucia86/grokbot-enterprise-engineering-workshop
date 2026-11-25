import { z } from "zod";
import { apiError, authenticated, labJson } from "../../../../server/http/lab-responses";
import { requests } from "../../../../server/procurement/requests";

export function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  return authenticated(async (actor) => {
    const id = z.uuid().safeParse((await params).id);
    if (!id.success) return apiError("NOT_FOUND");

    const request = await requests.find(actor, id.data);
    return request ? labJson(request) : apiError("NOT_FOUND");
  });
}
