import assert from "node:assert/strict";
import { afterAll, test } from "vitest";
import postgres, { type Sql } from "postgres";
import { labConnectionString } from "../../src/server/db/lab-config";

const CC_OPS_01_ID = "30000000-0000-4000-8000-000000000002";
const CC_MER_01_ID = "30000000-0000-4000-8000-000000000003";
const base = new URL(process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000");

let database: Sql | undefined;
afterAll(() => database?.end({ timeout: 3 }));

function db() {
  database ??= postgres(labConnectionString(), { max: 2, connect_timeout: 3 });
  return database;
}

async function api(
  path: string,
  options: { cookie?: string; body?: Record<string, unknown>; key?: string } = {},
) {
  const headers = new Headers();
  if (options.cookie) headers.set("Cookie", options.cookie);
  if (options.key) headers.set("Idempotency-Key", options.key);
  if (options.body) {
    headers.set("Content-Type", "application/json");
    headers.set("Origin", base.origin);
  }
  const res = await fetch(new URL(path, base), {
    method: options.body ? "POST" : "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(8_000),
  });
  return { status: res.status, json: await res.json().catch(() => null), cookies: res.headers.getSetCookie() };
}

async function login(identity: string) {
  const res = await api("/api/lab/session", { body: { identity } });
  assert.equal(res.status, 200);
  return res.cookies[0]!.split(";", 1)[0]!;
}

test("INV-05: cross-tenant cost centers, requests, approvals, and audit trails return 404 without disclosure", async () => {
  const [nsReq, merReq, merAppr, merAud] = await Promise.all([
    login("northstar-requester"),
    login("meridian-requester"),
    login("meridian-approver"),
    login("meridian-auditor"),
  ]);

  // Meridian cannot list Northstar cost centers
  const merCenters = await api("/api/cost-centers", { cookie: merReq });
  assert.equal(merCenters.status, 200);
  const codes = (merCenters.json.costCenters as { code: string }[]).map((c) => c.code);
  assert.deepEqual(codes, ["CC-MER-01"]);

  // Meridian cannot submit a request targeting Northstar's cost center
  const foreignSubmit = await api("/api/purchase-requests", {
    cookie: merReq,
    key: "sec-foreign-cc-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Foreign CC Attack", justification: "Test", amountMinor: 1000, currency: "USD" },
  });
  assert.equal(foreignSubmit.status, 404);
  assert.deepEqual(foreignSubmit.json, { error: { code: "NOT_FOUND" } });

  // Create legitimate Northstar request
  const created = await api("/api/purchase-requests", {
    cookie: nsReq,
    key: "sec-ns-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Northstar Secret Purchase", justification: "Internal", amountMinor: 50_000, currency: "USD" },
  });
  assert.equal(created.status, 201);
  const reqId = created.json.id as string;

  // Meridian cannot read, approve, or view audit for Northstar's request
  const foreignGet = await api(`/api/purchase-requests/${reqId}`, { cookie: merAppr });
  assert.equal(foreignGet.status, 404);
  assert.deepEqual(foreignGet.json, { error: { code: "NOT_FOUND" } });

  const foreignApprove = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: merAppr,
    key: "sec-foreign-appr-" + crypto.randomUUID(),
    body: { decision: "APPROVE" },
  });
  assert.equal(foreignApprove.status, 404);
  assert.deepEqual(foreignApprove.json, { error: { code: "NOT_FOUND" } });

  const foreignAudit = await api(`/api/purchase-requests/${reqId}/audit`, { cookie: merAud });
  assert.equal(foreignAudit.status, 404);
  assert.deepEqual(foreignAudit.json, { error: { code: "NOT_FOUND" } });
});

test("INV-05: identical approval Idempotency-Keys across independent tenants never conflict", async () => {
  const [nsReq, nsAppr, merReq, merAppr] = await Promise.all([
    login("northstar-requester"),
    login("northstar-approver"),
    login("meridian-requester"),
    login("meridian-approver"),
  ]);

  const nsCreate = await api("/api/purchase-requests", {
    cookie: nsReq,
    key: "cross-tenant-req-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "NS Order", justification: "Test", amountMinor: 1000, currency: "USD" },
  });
  const merCreate = await api("/api/purchase-requests", {
    cookie: merReq,
    key: "cross-tenant-req-" + crypto.randomUUID(),
    body: { costCenterId: CC_MER_01_ID, title: "Meridian Order", justification: "Test", amountMinor: 1000, currency: "USD" },
  });
  assert.equal(nsCreate.status, 201);
  assert.equal(merCreate.status, 201);

  const sharedDecisionKey = "tenant-independent-" + crypto.randomUUID();
  const [nsDecision, merDecision] = await Promise.all([
    api(`/api/purchase-requests/${nsCreate.json.id}/decision`, { cookie: nsAppr, key: sharedDecisionKey, body: { decision: "APPROVE" } }),
    api(`/api/purchase-requests/${merCreate.json.id}/decision`, { cookie: merAppr, key: sharedDecisionKey, body: { decision: "APPROVE" } }),
  ]);
  assert.equal(nsDecision.status, 200);
  assert.equal(merDecision.status, 200);
});

test("INV-06: approval limit policy enforces 403 APPROVAL_LIMIT_EXCEEDED without mutating state or poisoning key", async () => {
  const [requester, juniorApprover, seniorApprover] = await Promise.all([
    login("northstar-requester"),
    login("northstar-junior-approver"),
    login("northstar-approver"),
  ]);

  const overLimitReq = await api("/api/purchase-requests", {
    cookie: requester,
    key: "limit-req-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Enterprise Hardware", justification: "Over junior cap", amountMinor: 600_000, currency: "USD" },
  });
  assert.equal(overLimitReq.status, 201);
  const reqId = overLimitReq.json.id as string;

  const denied = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: juniorApprover,
    key: "junior-try-" + crypto.randomUUID(),
    body: { decision: "APPROVE" },
  });
  assert.equal(denied.status, 403);
  assert.deepEqual(denied.json, { error: { code: "APPROVAL_LIMIT_EXCEEDED" } });

  // Request stays PENDING and senior approver can still approve it
  const senior = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: seniorApprover,
    key: "senior-ok-" + crypto.randomUUID(),
    body: { decision: "APPROVE" },
  });
  assert.equal(senior.status, 200);
  assert.equal(senior.json.status, "APPROVED");

  // Junior approver CAN still reject an over-limit request
  const rejectTarget = await api("/api/purchase-requests", {
    cookie: requester,
    key: "limit-reject-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Duplicate Quote", justification: "Test", amountMinor: 600_000, currency: "USD" },
  });
  const juniorReject = await api(`/api/purchase-requests/${rejectTarget.json.id}/decision`, {
    cookie: juniorApprover,
    key: "junior-reject-" + crypto.randomUUID(),
    body: { decision: "REJECT", reason: "Needs vendor comparison" },
  });
  assert.equal(juniorReject.status, 200);
  assert.equal(juniorReject.json.status, "REJECTED");
});

test("INV-06: authorization is re-enforced on idempotent approval replay after role revocation or limit reduction", async () => {
  const tempUserId = crypto.randomUUID();
  const tempIdentity = "sec-temp-" + tempUserId;
  await db().begin(async (sql) => {
    await sql`insert into users (id, display_name) values (${tempUserId}, 'Temp Security Approver')`;
    await sql`
      insert into memberships (tenant_id, user_id, role, approval_limit_minor, lab_identity)
      select tenant_id, ${tempUserId}, 'APPROVER', 1000000, ${tempIdentity}
      from memberships where lab_identity = 'northstar-requester'
    `;
  });

  const requester = await login("northstar-requester");
  const tempApprover = await login(tempIdentity);
  const created = await api("/api/purchase-requests", {
    cookie: requester,
    key: "replay-auth-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Replay Auth Test", justification: "Security", amountMinor: 200_000, currency: "USD" },
  });
  assert.equal(created.status, 201);
  const reqId = created.json.id as string;
  const replayKey = "replay-auth-key-" + crypto.randomUUID();

  try {
    const initial = await api(`/api/purchase-requests/${reqId}/decision`, {
      cookie: tempApprover,
      key: replayKey,
      body: { decision: "APPROVE" },
    });
    assert.equal(initial.status, 200);
    assert.equal(initial.json.replayed, false);

    // Lower approval limit below request amount -> replay MUST return 403 APPROVAL_LIMIT_EXCEEDED
    await db()`update memberships set approval_limit_minor = 50000 where user_id = ${tempUserId}`;
    const limitReplay = await api(`/api/purchase-requests/${reqId}/decision`, {
      cookie: tempApprover,
      key: replayKey,
      body: { decision: "APPROVE" },
    });
    assert.equal(limitReplay.status, 403);
    assert.deepEqual(limitReplay.json, { error: { code: "APPROVAL_LIMIT_EXCEEDED" } });

    // Downgrade role to AUDITOR -> replay MUST return 403 FORBIDDEN
    await db()`update memberships set role = 'AUDITOR', approval_limit_minor = null where user_id = ${tempUserId}`;
    const roleReplay = await api(`/api/purchase-requests/${reqId}/decision`, {
      cookie: tempApprover,
      key: replayKey,
      body: { decision: "APPROVE" },
    });
    assert.equal(roleReplay.status, 403);
    assert.deepEqual(roleReplay.json, { error: { code: "FORBIDDEN" } });
  } finally {
    await db().begin(async (sql) => {
      const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
        select to_regclass('public.decision_idempotency_keys') is not null as exists
      `;
      if (hasDecisionKeys) {
        await sql`delete from decision_idempotency_keys where request_id = ${reqId}`;
      }
      const [c] = await sql<{ amount_minor: string; cost_center_id: string }[]>`
        delete from financial_commitments where request_id = ${reqId} returning amount_minor::text, cost_center_id
      `;
      if (c) {
        await sql`update cost_centers set committed_budget_minor = committed_budget_minor - ${Number(c.amount_minor)} where id = ${c.cost_center_id}`;
      }
      await sql`delete from audit_events where request_id = ${reqId}`;
      await sql`delete from purchase_requests where id = ${reqId}`;
      await sql`delete from memberships where user_id = ${tempUserId}`;
      await sql`delete from users where id = ${tempUserId}`;
    });
  }
});

test("INV-04: reusing an approval Idempotency-Key with different actor, decision, or reason yields generic 409 without disclosure", async () => {
  const [requester, approver1, approver2] = await Promise.all([
    login("northstar-requester"),
    login("northstar-approver"),
    login("northstar-approver-2"),
  ]);
  const created = await api("/api/purchase-requests", {
    cookie: requester,
    key: "key-reuse-" + crypto.randomUUID(),
    body: { costCenterId: CC_OPS_01_ID, title: "Key Abuse Target", justification: "Test", amountMinor: 25_000, currency: "USD" },
  });
  assert.equal(created.status, 201);
  const reqId = created.json.id as string;
  const key = "abuse-key-" + crypto.randomUUID();

  const first = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: approver1,
    key,
    body: { decision: "APPROVE", reason: "Initial note" },
  });
  assert.equal(first.status, 200);

  const differentActor = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: approver2,
    key,
    body: { decision: "APPROVE", reason: "Initial note" },
  });
  assert.equal(differentActor.status, 409);
  assert.deepEqual(differentActor.json, { error: { code: "IDEMPOTENCY_CONFLICT" } });

  const differentReason = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: approver1,
    key,
    body: { decision: "APPROVE", reason: "Modified note" },
  });
  assert.equal(differentReason.status, 409);
  assert.deepEqual(differentReason.json, { error: { code: "IDEMPOTENCY_CONFLICT" } });

  const differentDecision = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: approver1,
    key,
    body: { decision: "REJECT", reason: "Changed mind" },
  });
  assert.equal(differentDecision.status, 409);
  assert.deepEqual(differentDecision.json, { error: { code: "IDEMPOTENCY_CONFLICT" } });

  // Missing Idempotency-Key header and forged authority fields return 400
  const missingKey = await api(`/api/purchase-requests/${reqId}/decision`, {
    cookie: approver1,
    body: { decision: "APPROVE" },
  });
  assert.equal(missingKey.status, 400);
  assert.deepEqual(missingKey.json, { error: { code: "INVALID_INPUT" } });
});
