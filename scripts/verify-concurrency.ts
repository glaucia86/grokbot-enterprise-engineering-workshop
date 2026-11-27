import postgres from "postgres";
import { labConnectionString } from "../src/server/db/lab-config";
import { evaluateConcurrency, type PersistedCounts } from "./concurrency-observation";
import { labOrigin } from "./lab-origin";

const CC_OPS_01_ID = "30000000-0000-4000-8000-000000000002";

type CallOptions = { body?: Record<string, unknown>; headers?: Record<string, string> };

async function call(origin: string, path: string, { body, headers }: CallOptions = {}) {
  const response = await fetch(new URL(path, origin), {
    method: body === undefined ? "GET" : "POST",
    headers: { ...(body === undefined ? {} : { Origin: origin, "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive: false,
    redirect: "error",
    signal: AbortSignal.timeout(8_000),
  });
  const payload: { status?: unknown; id?: unknown } | null = await response.json().catch(() => null);
  return { status: response.status, body: payload, cookies: response.headers.getSetCookie() };
}

async function createLabSession(origin: string) {
  const login = await call(origin, "/api/lab/session", { body: { identity: "northstar-requester" } });
  const cookie = login.cookies[0]?.split(";", 1)[0];
  if (login.status !== 200 || !cookie?.startsWith("procurement_lab_session=")) {
    throw new Error("The synthetic requester session is unavailable.");
  }
  return cookie;
}

async function verify() {
  const origin = labOrigin();
  const db = postgres(labConnectionString(), { max: 1, connect_timeout: 3, connection: { statement_timeout: 3_000 } });
  try {
    const health = await call(origin, "/api/health");
    if (health.status !== 200 || health.body?.status !== "ready") throw new Error("The lab is not ready.");

    const cookie = await createLabSession(origin);
    const key = crypto.randomUUID();
    const submission = {
      body: {
        costCenterId: CC_OPS_01_ID,
        title: "Warehouse safety gloves",
        justification: "Workshop procurement exercise",
        amountMinor: 1250,
        currency: "USD",
      },
      headers: { Cookie: cookie, "Idempotency-Key": key },
    };
    const responses = await Promise.all([
      call(origin, "/api/purchase-requests", submission),
      call(origin, "/api/purchase-requests", submission),
    ]);

    const [persisted] = await db<PersistedCounts[]>`
      select count(distinct purchase.id)::int as "requestCount", count(event.id)::int as "creationEventCount"
      from purchase_requests purchase
      left join audit_events event on event.request_id = purchase.id
        and event.tenant_id = purchase.tenant_id and event.event_type = 'CREATED'
      where purchase.idempotency_key = ${key}
    `;
    return evaluateConcurrency({
      responses: responses.map(({ status, body }) => ({ status, id: body?.id })),
      ...persisted,
    });
  } finally {
    await db.end({ timeout: 3 });
  }
}

try {
  const result = await verify();
  console.log(JSON.stringify(result));
  if (result.status !== "pass") process.exitCode = 1;
} catch {
  console.log(JSON.stringify({ status: "blocked", message: "Check the loopback app, lab profile and disposable PostgreSQL connection." }));
  process.exitCode = 2;
}
