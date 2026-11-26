import postgres from "postgres";
import fixture from "../fixtures/ph42-duplicate-snapshot.json";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";
import { evaluateConcurrency, type PersistedCounts } from "./concurrency-observation";

async function verifyFixture() {
  if (!isLabEnabled()) throw new Error("The workshop lab profile is required.");

  const { tenantId, idempotencyKey } = fixture.scope;
  const db = postgres(labConnectionString(), { max: 1, connect_timeout: 3, connection: { statement_timeout: 3_000 } });

  try {
    const [persisted] = await db.begin("read only", (sql) => sql<PersistedCounts[]>`
      with fixture_requests as (
        select * from jsonb_to_recordset(${db.json(fixture.requests)}::jsonb)
          as request(id text, tenant_id text, idempotency_key text)
      ), fixture_audit as (
        select * from jsonb_to_recordset(${db.json(fixture.auditEvents)}::jsonb)
          as event(request_id text, tenant_id text, event_type text)
      )
      select count(distinct request.id)::int as "requestCount", count(event.request_id)::int as "creationEventCount"
      from fixture_requests request
      left join fixture_audit event on event.request_id = request.id
        and event.tenant_id = request.tenant_id and event.event_type = 'CREATED'
      where request.tenant_id = ${tenantId} and request.idempotency_key = ${idempotencyKey}
    `);
    return evaluateConcurrency({ responses: fixture.responses, ...persisted });
  } finally {
    await db.end({ timeout: 3 });
  }
}

try {
  const result = await verifyFixture();
  console.log(JSON.stringify({ source: "synthetic-snapshot", ...result }));
  if (result.status === "fail") process.exitCode = 1;
} catch {
  console.log(JSON.stringify({ source: "synthetic-snapshot", status: "blocked" }));
  process.exitCode = 2;
}
