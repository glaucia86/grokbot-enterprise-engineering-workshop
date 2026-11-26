import { keySchema, statusSchema, submissionSchema } from "../../../server/http/purchase-input";
import { apiError, authenticated, hasSameOrigin, labJson, readJson } from "../../../server/http/lab-responses";
import { requests } from "../../../server/procurement/requests";

export function GET(request: Request) {
  return authenticated(async (actor) => {
    const status = statusSchema.safeParse(new URL(request.url).searchParams.get("status") ?? undefined);
    if (!status.success) return apiError("INVALID_INPUT");

    return labJson({ requests: await requests.list(actor, status.data) });
  });
}

export function POST(request: Request) {
  return authenticated(async (actor) => {
    if (!hasSameOrigin(request)) return apiError("FORBIDDEN");

    const key = keySchema.safeParse(request.headers.get("idempotency-key"));
    if (!key.success) return apiError("INVALID_INPUT");

    const submission = submissionSchema.safeParse(await readJson(request));
    if (!submission.success) return apiError("INVALID_INPUT");

    const result = await requests.create(actor, submission.data, key.data);
    if (result.kind === "forbidden") return apiError("FORBIDDEN");
    if (result.kind === "conflict") return apiError("IDEMPOTENCY_CONFLICT");
    return labJson(result.request, result.kind === "created" ? 201 : 200);
  });
}
