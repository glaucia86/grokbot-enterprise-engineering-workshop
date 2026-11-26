import type { TenantActor } from "../../modules/procurement/domain/procurement";
import { readLabSession } from "../auth/lab-session";

const statuses = {
  INVALID_INPUT: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  APPROVAL_LIMIT_EXCEEDED: 403,
  NOT_FOUND: 404,
  IDEMPOTENCY_CONFLICT: 409,
  INVALID_TRANSITION: 409,
  INSUFFICIENT_BUDGET: 409,
  INTERNAL_ERROR: 500,
} as const;

export function labJson(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(code: keyof typeof statuses) {
  return labJson({ error: { code } }, statuses[code]);
}

export async function authenticated(work: (actor: TenantActor) => Promise<Response>) {
  try {
    const actor = await readLabSession();
    return actor ? await work(actor) : apiError("UNAUTHENTICATED");
  } catch {
    return apiError("INTERNAL_ERROR");
  }
}

export function labOrigin(request: Request) {
  const host = request.headers.get("host");
  if (!host || !/^(localhost|127\.0\.0\.1)(:[0-9]{1,5})?$/i.test(host)) return undefined;

  return new URL(request.url).protocol + "//" + host.toLowerCase();
}

export function hasSameOrigin(request: Request) {
  const expected = labOrigin(request);
  const origin = request.headers.get("origin");
  return !!expected && (origin === null || origin === expected);
}

export async function readJson(request: Request): Promise<unknown> {
  const type = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  if (type !== "application/json") return undefined;
  return request.json().catch(() => undefined);
}
