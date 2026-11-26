import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";
import postgres from "postgres";
import { labConnectionString } from "../../src/server/db/lab-config.mjs";

const base = new URL(process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000");
const requests = "/api/purchase-requests";
let database;
after(() => database?.end({ timeout: 3 }));

function labDatabase() {
  database ??= postgres(labConnectionString(), { max: 1, connect_timeout: 3 });
  return database;
}

async function persistedCounts(key) {
  const [counts] = await labDatabase()`
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
  await assertError(await call(requests, { cookie: owner, key, body: { ...sample(), amountMinor: 99 } }),
    409, "IDEMPOTENCY_CONFLICT");
  await assertError(await call(requests, { cookie: peer, key, body: sample() }), 409, "IDEMPOTENCY_CONFLICT");
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

async function assertError(response, status, code) {
  assert.equal(response.status, status);
  assert.deepEqual(await response.json(), { error: { code } });
}

async function createRequest(cookie, key) {
  const response = await call(requests, { cookie, key, body: sample() });
  assert.equal(response.status, 201);
  return response.json();
}

function decide(id, cookie, body) {
  return call(requests + "/" + id + "/decision", { cookie, body });
}

async function readRequest(id, cookie) {
  const response = await call(requests + "/" + id, { cookie });
  assert.equal(response.status, 200);
  return response.json();
}

async function readAudit(id, cookie) {
  const response = await call(requests + "/" + id + "/audit", { cookie });
  assert.equal(response.status, 200);
  const { events } = await response.json();
  return events.map(({ type, actorName, reason }) => ({ type, actorName, reason }));
}

async function withSyntheticNorthstarMember(role, exercise) {
  const db = labDatabase();
  const userId = randomUUID();
  const identity = "vs02-" + userId;
  const displayName = "VS-02 Temporary " + role;
  await db.begin(async (sql) => {
    await sql`insert into users (id, display_name) values (${userId}, ${displayName})`;
    const memberships = await sql`
      insert into memberships (tenant_id, user_id, role, lab_identity)
      select tenant_id, ${userId}, ${role}, ${identity}
      from memberships where lab_identity = 'northstar-requester'
      returning user_id
    `;
    assert.equal(memberships.length, 1, "the Northstar tenant fixture exists");
  });

  try {
    await exercise({ userId, identity, displayName });
  } finally {
    await db.begin(async (sql) => {
      await sql`
        delete from audit_events where request_id in (
          select id from purchase_requests where requester_id = ${userId}
        )
      `;
      await sql`delete from purchase_requests where requester_id = ${userId}`;
      await sql`delete from memberships where user_id = ${userId}`;
      await sql`delete from users where id = ${userId}`;
    });
  }
}

async function withAuditWriteRejected(field, value, eventType, exercise) {
  const db = labDatabase();
  const name = "vs02_audit_" + randomUUID().replaceAll("-", "");
  // PostgreSQL utility statements require quoted literals in CHECK expressions.
  const [{ statement }] = await db`
    select format(
      'alter table audit_events add constraint %I check (%I <> %L::uuid or event_type <> %L) not valid',
      ${name}::text, ${field}::text, ${value}::text, ${eventType}::text
    ) as statement
  `;
  await db.unsafe(statement);
  try {
    await exercise();
  } finally {
    await db`alter table audit_events drop constraint ${db(name)}`;
  }
}

test("an equivalent replay returns the original request without duplicating its creation event", async () => {
  const requester = await selectIdentity("northstar-requester");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  const replay = await call(requests, {
    cookie: requester,
    key,
    body: { ...sample(), title: "Safety gloves", justification: "Warehouse replenishment" },
  });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), created);
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
});

test("replay uses the normalized purchase when a historical fingerprint differs", async () => {
  const requester = await selectIdentity("northstar-requester");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  await labDatabase()`update purchase_requests set request_hash = 'legacy-v0' where id = ${created.id}`;

  const equivalent = await call(requests, { cookie: requester, key, body: sample() });
  assert.equal(equivalent.status, 200);
  assert.deepEqual(await equivalent.json(), created);
  await assertError(await call(requests, { cookie: requester, key, body: { ...sample(), amountMinor: 99 } }),
    409, "IDEMPOTENCY_CONFLICT");
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
});

test("an approver decides a pending request and replay returns its approved state", async () => {
  const requester = await selectIdentity("northstar-requester");
  const approver = await selectIdentity("northstar-approver");
  const auditor = await selectIdentity("northstar-auditor");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  const response = await decide(created.id, approver, { decision: "APPROVE" });
  assert.equal(response.status, 200);
  const approved = await response.json();
  assert.equal(approved.id, created.id);
  assert.equal(approved.status, "APPROVED");

  const replay = await call(requests, { cookie: requester, key, body: sample() });
  assert.equal(replay.status, 200);
  assert.deepEqual(await replay.json(), approved);
  assert.deepEqual(await readAudit(created.id, auditor), [
    { type: "CREATED", actorName: "Northstar Requester", reason: null },
    { type: "APPROVED", actorName: "Northstar Approver", reason: null },
  ]);
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 2 });
});

test("rejection records the normalized reason and a terminal request cannot be changed", async () => {
  const requester = await selectIdentity("northstar-requester");
  const approver = await selectIdentity("northstar-approver");
  const auditor = await selectIdentity("northstar-auditor");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  const response = await decide(created.id, approver, { decision: "REJECT", reason: "  Reconfirm quantity  " });
  assert.equal(response.status, 200);
  const rejected = await response.json();
  assert.equal(rejected.id, created.id);
  assert.equal(rejected.status, "REJECTED");
  await assertError(await decide(created.id, approver, { decision: "APPROVE" }), 409, "INVALID_TRANSITION");
  assert.deepEqual(await readRequest(created.id, requester), rejected);
  assert.deepEqual(await readAudit(created.id, auditor), [
    { type: "CREATED", actorName: "Northstar Requester", reason: null },
    { type: "REJECTED", actorName: "Northstar Approver", reason: "Reconfirm quantity" },
  ]);
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 2 });
});

test("invalid, unauthenticated and out-of-scope decisions preserve the request and audit", async () => {
  const requester = await selectIdentity("northstar-requester");
  const approver = await selectIdentity("northstar-approver");
  const auditor = await selectIdentity("northstar-auditor");
  const foreign = await selectIdentity("meridian-approver");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  const approval = { decision: "APPROVE" };
  await assertError(await decide(created.id, undefined, approval), 401, "UNAUTHENTICATED");
  await assertError(await decide(created.id, requester, approval), 403, "FORBIDDEN");
  await assertError(await decide(created.id, auditor, approval), 403, "FORBIDDEN");
  await assertError(await decide(created.id, foreign, approval), 404, "NOT_FOUND");
  await assertError(await decide(randomUUID(), approver, approval), 404, "NOT_FOUND");
  for (const body of [
    { decision: "REJECT" },
    { decision: "REJECT", reason: "   " },
    { decision: "REJECT", reason: "x".repeat(2_001) },
    { decision: "REJECT", reason: "broken" + String.fromCharCode(0) },
    { decision: "CANCEL" },
  ]) {
    await assertError(await decide(created.id, approver, body), 400, "INVALID_INPUT");
  }
  assert.deepEqual(await readRequest(created.id, requester), created);
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
});

test("a requester who becomes an approver cannot decide their own request", async () => {
  await withSyntheticNorthstarMember("REQUESTER", async ({ userId, identity }) => {
    const requester = await selectIdentity(identity);
    const key = randomUUID();
    const created = await createRequest(requester, key);
    await labDatabase()`update memberships set role = 'APPROVER' where user_id = ${userId}`;
    await assertError(await decide(created.id, requester, { decision: "APPROVE" }), 403, "FORBIDDEN");
    assert.deepEqual(await readRequest(created.id, requester), created);
    assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
  });
});

test("two concurrent decisions by different approvers persist one terminal result", async () => {
  await withSyntheticNorthstarMember("APPROVER", async ({ identity, displayName }) => {
    const requester = await selectIdentity("northstar-requester");
    const approving = await selectIdentity("northstar-approver");
    const rejecting = await selectIdentity(identity);
    const auditor = await selectIdentity("northstar-auditor");
    const key = randomUUID();
    const created = await createRequest(requester, key);
    try {
      const [approve, reject] = await Promise.all([
        decide(created.id, approving, { decision: "APPROVE" }),
        decide(created.id, rejecting, { decision: "REJECT", reason: "Reconfirm quantity" }),
      ]);
      assert.deepEqual([approve.status, reject.status].sort(), [200, 409]);
      const approved = approve.status === 200;
      const winner = await (approved ? approve : reject).json();
      await assertError(approved ? reject : approve, 409, "INVALID_TRANSITION");
      assert.equal(winner.id, created.id);
      assert.equal(winner.status, approved ? "APPROVED" : "REJECTED");
      assert.deepEqual(await readRequest(created.id, requester), winner);
      assert.deepEqual(await readAudit(created.id, auditor), [
        { type: "CREATED", actorName: "Northstar Requester", reason: null },
        approved
          ? { type: "APPROVED", actorName: "Northstar Approver", reason: null }
          : { type: "REJECTED", actorName: displayName, reason: "Reconfirm quantity" },
      ]);
      assert.deepEqual(await persistedCounts(key), { requests: 1, events: 2 });
    } finally {
      await labDatabase().begin(async (sql) => {
        await sql`delete from audit_events where request_id = ${created.id}`;
        await sql`delete from purchase_requests where id = ${created.id}`;
      });
    }
  });
});

test("an audit write failure rolls back creation and leaves the key reusable", async () => {
  await withSyntheticNorthstarMember("REQUESTER", async ({ identity, userId }) => {
    const requester = await selectIdentity(identity);
    const key = randomUUID();
    await withAuditWriteRejected("actor_id", userId, "CREATED", async () => {
      await assertError(await call(requests, { cookie: requester, key, body: sample() }), 500, "INTERNAL_ERROR");
      assert.deepEqual(await persistedCounts(key), { requests: 0, events: 0 });
      const [audit] = await labDatabase()`select count(*)::int as events from audit_events where actor_id = ${userId}`;
      assert.equal(audit.events, 0);
    });
    await createRequest(requester, key);
    assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
  });
});

test("an audit write failure rolls back a decision before a retry succeeds", async () => {
  const requester = await selectIdentity("northstar-requester");
  const approver = await selectIdentity("northstar-approver");
  const key = randomUUID();
  const created = await createRequest(requester, key);
  const approval = { decision: "APPROVE" };
  await withAuditWriteRejected("request_id", created.id, "APPROVED", async () => {
    await assertError(await decide(created.id, approver, approval), 500, "INTERNAL_ERROR");
    assert.deepEqual(await readRequest(created.id, requester), created);
    assert.deepEqual(await persistedCounts(key), { requests: 1, events: 1 });
  });

  const retry = await decide(created.id, approver, approval);
  assert.equal(retry.status, 200);
  assert.equal((await retry.json()).status, "APPROVED");
  assert.deepEqual(await persistedCounts(key), { requests: 1, events: 2 });
});
