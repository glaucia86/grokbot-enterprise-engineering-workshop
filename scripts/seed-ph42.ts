import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";

const NORTHSTAR_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const NORTHSTAR_REQUESTER_ID = "20000000-0000-4000-8000-000000000001";
const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";
const REQ_A_ID = "40000000-0000-4000-8000-000000000001";
const REQ_B_ID = "40000000-0000-4000-8000-000000000002";

if (!isLabEnabled()) {
  throw new Error("Enable WORKSHOP_LAB_MODE=enabled before seeding the PH-42 demo scenario.");
}

const db = postgres(labConnectionString(), { max: 1, connect_timeout: 3, connection: { statement_timeout: 5_000 } });

try {
  await db.begin(async (sql) => {
    const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
      select to_regclass('public.decision_idempotency_keys') is not null as exists
    `;
    if (hasDecisionKeys) {
      await sql`
        delete from decision_idempotency_keys
        where request_id in (select id from purchase_requests where cost_center_id = ${CC_ENG_01_ID})
      `;
    }
    await sql`delete from financial_commitments where cost_center_id = ${CC_ENG_01_ID}`;
    await sql`
      delete from audit_events
      where request_id in (select id from purchase_requests where cost_center_id = ${CC_ENG_01_ID})
    `;
    await sql`delete from purchase_requests where cost_center_id = ${CC_ENG_01_ID}`;
    await sql`
      update cost_centers
      set allocated_budget_minor = 1000000, committed_budget_minor = 0, updated_at = now()
      where id = ${CC_ENG_01_ID}
    `;

    for (const item of [
      {
        id: REQ_A_ID,
        title: "Cloud Security Audit Tooling",
        justification: "Annual enterprise SAST/DAST licensing for Platform Engineering",
        key: "ph42-demo-request-a",
      },
      {
        id: REQ_B_ID,
        title: "CI Runner Capacity Expansion",
        justification: "Dedicated isolated build runners for Q4 compliance release",
        key: "ph42-demo-request-b",
      },
    ]) {
      await sql`
        insert into purchase_requests (
          id, tenant_id, cost_center_id, requester_id, title, justification,
          amount_minor, currency, status, idempotency_key, request_hash
        ) values (
          ${item.id}, ${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${NORTHSTAR_REQUESTER_ID},
          ${item.title}, ${item.justification}, 700000, 'USD', 'PENDING', ${item.key}, ${item.key}
        )
      `;
      await sql`
        insert into audit_events (tenant_id, request_id, actor_id, event_type)
        values (${NORTHSTAR_TENANT_ID}, ${item.id}, ${NORTHSTAR_REQUESTER_ID}, 'CREATED')
      `;
    }
  });
  console.log(JSON.stringify({
    status: "seeded",
    costCenter: { id: CC_ENG_01_ID, code: "CC-ENG-01", allocatedBudgetMinor: 1_000_000, committedBudgetMinor: 0 },
    pendingRequests: [
      { id: REQ_A_ID, title: "Cloud Security Audit Tooling", amountMinor: 700_000 },
      { id: REQ_B_ID, title: "CI Runner Capacity Expansion", amountMinor: 700_000 },
    ],
  }, null, 2));
} finally {
  await db.end({ timeout: 3 });
}
