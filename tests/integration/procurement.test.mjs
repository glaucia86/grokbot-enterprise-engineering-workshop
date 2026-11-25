import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import postgres from "postgres";
import { labConnectionString } from "../../src/server/db/lab-config.mjs";

const base = new URL(process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000");
const requests = "/api/purchase-requests";
let database;
after(() => database?.end({ timeout: 3 }));

async function persistedCounts(key) {
  database ??= postgres(labConnectionString(), { max: 1, connect_timeout: 3 });
  const [counts] = await database`
    select count(distinct request.id)::int as requests, count(event.id)::int as events
    from purchase_requests request
    left join audit_events event
      on event.request_id = request.id and event.tenant_id = request.tenant_id
    where request.idempotency_key = ${key}
  `;
  return counts;
}

function call(path, { cookie, body, key, headers: extraHeaders } = {}) {
  const headers = new Headers(extraHeaders);
  if (cookie) headers.set("Cookie", cookie);
  if (key) headers.set("Idempotency-Key", key);
  if (body) headers.set("Content-Type", "application/json");
  return fetch(new URL(path, base), {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8_000),
  });
}

async function selectIdentity(identity, previousCookie) {
  const response = await call("/api/lab/session", {
    body: { identity },
    cookie: previousCookie,
    headers: { Origin: base.origin },
  });
  assert.equal(response.status, 200);
  const sessionCookie = response.headers.get("set-cookie");
  assert.ok(sessionCookie?.includes("HttpOnly"), "session cookie is HttpOnly");
  assert.ok(sessionCookie?.toLowerCase().split(";").some((part) => part.trim() === "samesite=strict"),
    "session cookie is same-site only");
  return sessionCookie.split(";", 1)[0];
}

function sample() {
  return { title: "  Safety gloves  ", justification: "  Warehouse replenishment  ", amountMinor: 1250, currency: "USD" };
}

test("a seeded requester creates and finds their purchase request", async () => {
  const cookie = await selectIdentity("northstar-requester");
  const key = randomUUID();
  const created = await call(requests, { cookie, key, body: sample() });
  assert.equal(created.status, 201);
  const record = await created.json();
  assert.equal(record.title, "Safety gloves");
  assert.equal(record.justification, "Warehouse replenishment");
  assert.equal(record.amountMinor, 1250);
  assert.equal(record.status, "PENDING");

  const listed = await call(requests + "?status=PENDING", { cookie });
  assert.equal(listed.status, 200);
  assert.ok((await listed.json()).requests.some(({ id }) => id === record.id));
  const detail = await call(requests + "/" + record.id, { cookie });
  assert.equal(detail.status, 200);
  assert.deepEqual(await detail.json(), record);
});

test("tenant and requester ownership apply to lists, details and audit", async () => {
  const owner = await selectIdentity("northstar-requester");
  const peer = await selectIdentity("northstar-requester-alt");
  const meridian = await selectIdentity("meridian-requester");
  const northstarAuditor = await selectIdentity("northstar-auditor");
  const meridianAuditor = await selectIdentity("meridian-auditor");
  const northstarApprover = await selectIdentity("northstar-approver");
  const key = randomUUID();
  const northstarResponse = await call(requests, { cookie: owner, key, body: sample() });
  const meridianResponse = await call(requests, { cookie: meridian, key, body: sample() });
  assert.equal(northstarResponse.status, 201);
  assert.equal(meridianResponse.status, 201);
  const northstar = await northstarResponse.json();
  const foreign = await meridianResponse.json();
  assert.notEqual(northstar.id, foreign.id);

  for (const cookie of [peer, meridian, meridianAuditor]) {
    const listed = await call(requests, { cookie });
    assert.equal(listed.status, 200);
    assert.ok(!(await listed.json()).requests.some(({ id }) => id === northstar.id));
    const detail = await call(requests + "/" + northstar.id, { cookie });
    assert.equal(detail.status, 404);
    assert.deepEqual(await detail.json(), { error: { code: "NOT_FOUND" } });
  }

  for (const cookie of [northstarAuditor, northstarApprover]) {
    const listed = await call(requests, { cookie });
    assert.equal(listed.status, 200);
    const summaries = (await listed.json()).requests;
    assert.ok(summaries.some(({ id }) => id === northstar.id));
    assert.ok(!summaries.some(({ id }) => id === foreign.id));
    const audit = await call(requests + "/" + northstar.id + "/audit", { cookie });
    assert.equal(audit.status, 200);
    const { events } = await audit.json();
    assert.deepEqual(events.map(({ type, actorName }) => ({ type, actorName })), [
      { type: "CREATED", actorName: "Northstar Requester" },
    ]);
  }
  assert.equal((await call(requests + "/" + northstar.id + "/audit", { cookie: owner })).status, 403);
  assert.equal((await call(requests + "/" + northstar.id + "/audit", { cookie: meridianAuditor })).status, 404);
  assert.deepEqual(await persistedCounts(key), { requests: 2, events: 2 });
});

test("key conflicts do not disclose another requester or repeat writes", async () => {
  const owner = await selectIdentity("northstar-requester");
  const peer = await selectIdentity("northstar-requester-alt");
  const key = randomUUID();
  assert.equal((await call(requests, { cookie: owner, key, body: sample() })).status, 201);
  for (const cookie of [owner, peer]) {
    const conflict = await call(requests, { cookie, key, body: { ...sample(), amountMinor: 99 } });
    assert.equal(conflict.status, 409);
    assert.deepEqual(await conflict.json(), { error: { code: "IDEMPOTENCY_CONFLICT" } });
  }
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
});

test("invalid input and denied roles leave no purchase request or audit event", async () => {
  const owner = await selectIdentity("northstar-requester");
  const auditor = await selectIdentity("northstar-auditor");
  const approver = await selectIdentity("northstar-approver");
  const key = randomUUID();
  assert.equal((await call(requests, { body: sample(), key })).status, 401);
  for (const cookie of [auditor, approver]) {
    assert.equal((await call(requests, { cookie, body: sample(), key })).status, 403);
  }
  for (const body of [
    { ...sample(), amountMinor: 0 },
    { ...sample(), currency: "BRL" },
    { ...sample(), title: "Broken" + String.fromCharCode(0) },
    { ...sample(), tenantId: "another-tenant" },
  ]) {
    const invalid = await call(requests, { cookie: owner, body, key });
    assert.equal(invalid.status, 400);
    assert.deepEqual(await invalid.json(), { error: { code: "INVALID_INPUT" } });
  }
  assert.equal((await call(requests, { cookie: owner, body: sample(), key: "a".repeat(129) })).status, 400);
  assert.equal((await call(requests + "?status=UNKNOWN", { cookie: owner })).status, 400);
  assert.deepEqual(await persistedCounts(key), { requests: 0, events: 0 });
});

test("switching a synthetic lab identity revokes the previous server session", async () => {
  const rejected = await call("/api/lab/session", {
    body: { identity: "northstar-requester" },
    headers: { Origin: "https://separate-origin.example.invalid" },
  });
  assert.equal(rejected.status, 403);
  assert.equal(rejected.headers.has("set-cookie"), false);

  const login = await selectIdentity("northstar-requester");
  const switched = await selectIdentity("meridian-requester", login);
  assert.equal((await call(requests, { cookie: login })).status, 401);
  assert.equal((await call(requests, { cookie: switched })).status, 200);
});
