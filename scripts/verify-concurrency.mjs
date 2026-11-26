import { randomUUID } from "node:crypto";
import { request } from "node:http";
import postgres from "postgres";
import { labConnectionString } from "../src/server/db/lab-config.mjs";
import { evaluateConcurrency } from "./concurrency-observation.mjs";
import { labOrigin } from "./lab-origin.mjs";

function call(origin, path, { body, headers = {} } = {}) {
  const data = body === undefined ? undefined : JSON.stringify(body);
  const requestHeaders = data === undefined ? headers : {
    Origin: origin,
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
    ...headers,
  };

  return new Promise((resolve, reject) => {
    const operation = request(new URL(path, origin), {
      method: data === undefined ? "GET" : "POST",
      headers: requestHeaders,
      agent: false,
      signal: AbortSignal.timeout(8_000),
    }, (response) => {
      response.setEncoding("utf8");
      let text = "";
      response.on("data", (chunk) => { text += chunk; });
      response.once("error", reject);
      response.once("end", () => {
        try {
          resolve({
            status: response.statusCode,
            body: JSON.parse(text),
            cookies: response.headers["set-cookie"] ?? [],
          });
        } catch {
          resolve({ status: response.statusCode, cookies: [] });
        }
      });
    });
    operation.once("error", reject);
    operation.end(data);
  });
}

async function createLabSession(origin) {
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
    const key = randomUUID();
    const submission = {
      body: { title: "Warehouse safety gloves", justification: "Workshop procurement exercise", amountMinor: 1250, currency: "USD" },
      headers: { Cookie: cookie, "Idempotency-Key": key },
    };
    const responses = await Promise.all([
      call(origin, "/api/purchase-requests", submission),
      call(origin, "/api/purchase-requests", submission),
    ]);

    const [persisted] = await db`
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
