import assert from "node:assert/strict";
import { afterAll, test } from "vitest";
import postgres, { type Sql } from "postgres";
import { labConnectionString } from "../../src/server/db/lab-config";

const NORTHSTAR_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const base = new URL(process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000");

let database: Sql | undefined;
afterAll(() => database?.end({ timeout: 3 }));

function db() {
  database ??= postgres(labConnectionString(), { max: 2, connect_timeout: 3 });
  return database;
}

async function api(
  path: string,
  options: { cookie?: string; body?: Record<string, unknown>; key?: string; extraHeaders?: Record<string, string> } = {},
) {
  const headers = new Headers(options.extraHeaders);
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
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, json: await res.json().catch(() => null), cookies: res.headers.getSetCookie() };
}

async function login(identity: string) {
  const res = await api("/api/lab/session", { body: { identity } });
  assert.equal(res.status, 200);
  const cookie = res.cookies[0]?.split(";", 1)[0];
  assert.ok(cookie);
  return cookie;
}

async function withDisposableCostCenter(
  allocatedBudgetMinor: number,
  work: (costCenterId: string) => Promise<void>,
) {
  const id = crypto.randomUUID();
  const code = "CC-CONC-" + id.slice(0, 8).toUpperCase();
  await db()`
    insert into cost_centers (id, tenant_id, code, name, currency, allocated_budget_minor, committed_budget_minor)
    values (${id}, ${NORTHSTAR_TENANT_ID}, ${code}, 'Concurrency Test Cost Center', 'USD', ${allocatedBudgetMinor}, 0)
  `;
  try {
    await work(id);
  } finally {
    await db().begin(async (sql) => {
      const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
        select to_regclass('public.decision_idempotency_keys') is not null as exists
      `;
      if (hasDecisionKeys) {
        await sql`
          delete from decision_idempotency_keys
          where request_id in (select id from purchase_requests where cost_center_id = ${id})
        `;
      }
      await sql`delete from financial_commitments where cost_center_id = ${id}`;
      await sql`
        delete from audit_events
        where request_id in (select id from purchase_requests where cost_center_id = ${id})
      `;
      await sql`delete from purchase_requests where cost_center_id = ${id}`;
      await sql`delete from cost_centers where id = ${id}`;
    });
  }
}

async function createPendingRequest(cookie: string, costCenterId: string, amountMinor: number, title: string) {
  const res = await api("/api/purchase-requests", {
    cookie,
    key: "conc-req-" + crypto.randomUUID(),
    body: { costCenterId, title, justification: "Concurrency invariant test", amountMinor, currency: "USD" },
  });
  assert.equal(res.status, 201);
  return res.json.id as string;
}

test("INV-01 / INV-02: two concurrent $7,000 approvals against a $10,000 budget approve exactly one", async () => {
  await withDisposableCostCenter(1_000_000, async (costCenterId) => {
    const [requester, approver1, approver2] = await Promise.all([
      login("northstar-requester"),
      login("northstar-approver"),
      login("northstar-approver-2"),
    ]);
    const [reqA, reqB] = await Promise.all([
      createPendingRequest(requester, costCenterId, 700_000, "Security Audit Tooling"),
      createPendingRequest(requester, costCenterId, 700_000, "CI Runner Capacity"),
    ]);

    const [resA, resB] = await Promise.all([
      api(`/api/purchase-requests/${reqA}/decision`, {
        cookie: approver1,
        key: "appr-a-" + crypto.randomUUID(),
        body: { decision: "APPROVE" },
      }),
      api(`/api/purchase-requests/${reqB}/decision`, {
        cookie: approver2,
        key: "appr-b-" + crypto.randomUUID(),
        body: { decision: "APPROVE" },
      }),
    ]);

    assert.deepEqual([resA.status, resB.status].sort(), [200, 409]);
    const loser = resA.status === 409 ? resA : resB;
    assert.deepEqual(loser.json, { error: { code: "INSUFFICIENT_BUDGET" } });

    const [center] = await db()<{ allocated: string; committed: string }[]>`
      select allocated_budget_minor::text as allocated, committed_budget_minor::text as committed
      from cost_centers where id = ${costCenterId}
    `;
    const [commitments] = await db()<{ count: number; total: string }[]>`
      select count(*)::int as count, coalesce(sum(amount_minor), 0)::text as total
      from financial_commitments where cost_center_id = ${costCenterId}
    `;
    const [audits] = await db()<{ count: number }[]>`
      select count(*)::int as count
      from audit_events where request_id in (${reqA}, ${reqB}) and event_type = 'APPROVED'
    `;
    assert.equal(Number(center.allocated), 1_000_000);
    assert.equal(Number(center.committed), 700_000);
    assert.equal(commitments.count, 1);
    assert.equal(Number(commitments.total), 700_000);
    assert.equal(audits.count, 1);
  });
});

test("INV-01 / INV-02: 6-way concurrent burst of $3,000 approvals against $10,000 approves at most 3", async () => {
  await withDisposableCostCenter(1_000_000, async (costCenterId) => {
    const [requester, approver1, approver2] = await Promise.all([
      login("northstar-requester"),
      login("northstar-approver"),
      login("northstar-approver-2"),
    ]);
    const requestIds = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        createPendingRequest(requester, costCenterId, 300_000, `Burst Purchase ${i + 1}`),
      ),
    );

    const results = await Promise.all(
      requestIds.map((id, i) =>
        api(`/api/purchase-requests/${id}/decision`, {
          cookie: i % 2 === 0 ? approver1 : approver2,
          key: `burst-${i}-${crypto.randomUUID()}`,
          body: { decision: "APPROVE" },
        }),
      ),
    );

    const successes = results.filter((r) => r.status === 200);
    const budgetRejects = results.filter(
      (r) => r.status === 409 && r.json?.error?.code === "INSUFFICIENT_BUDGET",
    );
    assert.equal(successes.length, 3);
    assert.equal(budgetRejects.length, 3);

    const [center] = await db()<{ committed: string }[]>`
      select committed_budget_minor::text as committed from cost_centers where id = ${costCenterId}
    `;
    const [commitments] = await db()<{ count: number; total: string }[]>`
      select count(*)::int as count, coalesce(sum(amount_minor), 0)::text as total
      from financial_commitments where cost_center_id = ${costCenterId}
    `;
    assert.equal(Number(center.committed), 900_000);
    assert.equal(commitments.count, 3);
    assert.equal(Number(commitments.total), 900_000);
  });
});

test("INV-03 / INV-08: concurrent identical approval retries with the same Idempotency-Key commit once", async () => {
  await withDisposableCostCenter(1_000_000, async (costCenterId) => {
    const [requester, approver] = await Promise.all([
      login("northstar-requester"),
      login("northstar-approver"),
    ]);
    const reqId = await createPendingRequest(requester, costCenterId, 700_000, "Retry Storm Purchase");
    const sharedKey = "same-key-" + crypto.randomUUID();

    const results = await Promise.all([
      api(`/api/purchase-requests/${reqId}/decision`, { cookie: approver, key: sharedKey, body: { decision: "APPROVE" } }),
      api(`/api/purchase-requests/${reqId}/decision`, { cookie: approver, key: sharedKey, body: { decision: "APPROVE" } }),
      api(`/api/purchase-requests/${reqId}/decision`, { cookie: approver, key: sharedKey, body: { decision: "APPROVE" } }),
    ]);

    for (const r of results) {
      assert.equal(r.status, 200);
      assert.equal(r.json.status, "APPROVED");
    }

    const [center] = await db()<{ committed: string }[]>`
      select committed_budget_minor::text as committed from cost_centers where id = ${costCenterId}
    `;
    const [commitments] = await db()<{ count: number }[]>`
      select count(*)::int as count from financial_commitments where request_id = ${reqId}
    `;
    const [audits] = await db()<{ count: number }[]>`
      select count(*)::int as count from audit_events where request_id = ${reqId} and event_type = 'APPROVED'
    `;
    assert.equal(Number(center.committed), 700_000);
    assert.equal(commitments.count, 1);
    assert.equal(audits.count, 1);
  });
});

test("INV-04 / INV-07: concurrent same key on different requests returns 409 IDEMPOTENCY_CONFLICT and different keys on same request return 409 INVALID_TRANSITION", async () => {
  await withDisposableCostCenter(2_000_000, async (costCenterId) => {
    const [requester, approver1, approver2] = await Promise.all([
      login("northstar-requester"),
      login("northstar-approver"),
      login("northstar-approver-2"),
    ]);
    const [reqA, reqB, reqC] = await Promise.all([
      createPendingRequest(requester, costCenterId, 400_000, "Key Collision A"),
      createPendingRequest(requester, costCenterId, 400_000, "Key Collision B"),
      createPendingRequest(requester, costCenterId, 400_000, "Double Approval Target"),
    ]);

    const sharedKey = "collision-" + crypto.randomUUID();
    const [colA, colB] = await Promise.all([
      api(`/api/purchase-requests/${reqA}/decision`, { cookie: approver1, key: sharedKey, body: { decision: "APPROVE" } }),
      api(`/api/purchase-requests/${reqB}/decision`, { cookie: approver1, key: sharedKey, body: { decision: "APPROVE" } }),
    ]);
    assert.deepEqual([colA.status, colB.status].sort(), [200, 409]);
    const conflict = colA.status === 409 ? colA : colB;
    assert.deepEqual(conflict.json, { error: { code: "IDEMPOTENCY_CONFLICT" } });

    const [dup1, dup2] = await Promise.all([
      api(`/api/purchase-requests/${reqC}/decision`, { cookie: approver1, key: "diff-1-" + crypto.randomUUID(), body: { decision: "APPROVE" } }),
      api(`/api/purchase-requests/${reqC}/decision`, { cookie: approver2, key: "diff-2-" + crypto.randomUUID(), body: { decision: "APPROVE" } }),
    ]);
    assert.deepEqual([dup1.status, dup2.status].sort(), [200, 409]);
    const invalidTransition = dup1.status === 409 ? dup1 : dup2;
    assert.deepEqual(invalidTransition.json, { error: { code: "INVALID_TRANSITION" } });

    const [center] = await db()<{ committed: string }[]>`
      select committed_budget_minor::text as committed from cost_centers where id = ${costCenterId}
    `;
    assert.equal(Number(center.committed), 800_000);
  });
});
