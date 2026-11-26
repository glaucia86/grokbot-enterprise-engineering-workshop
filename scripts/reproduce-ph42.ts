import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";
import { labOrigin } from "./lab-origin";

const NORTHSTAR_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";
const ALLOCATED_MINOR = 1_000_000;
const REQUEST_AMOUNT_MINOR = 700_000;

type ApiCallResult = {
  status: number;
  body: Record<string, unknown> | null;
  cookies: string[];
};

async function apiCall(
  origin: string,
  path: string,
  options: { body?: Record<string, unknown>; headers?: Record<string, string> } = {},
): Promise<ApiCallResult> {
  const response = await fetch(new URL(path, origin), {
    method: options.body === undefined ? "GET" : "POST",
    headers: {
      ...(options.body === undefined ? {} : { Origin: origin, "Content-Type": "application/json" }),
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    keepalive: false,
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  return { status: response.status, body, cookies: response.headers.getSetCookie() };
}

async function login(origin: string, identity: string): Promise<string> {
  const res = await apiCall(origin, "/api/lab/session", { body: { identity } });
  const cookie = res.cookies[0]?.split(";", 1)[0];
  if (res.status !== 200 || !cookie?.startsWith("procurement_lab_session=")) {
    throw new Error(`Unable to establish synthetic lab session for ${identity}.`);
  }
  return cookie;
}

type BudgetSnapshot = {
  costCenterId: string;
  costCenterCode: string;
  allocatedBudgetMinor: number;
  committedBudgetMinor: number;
  availableBudgetMinor: number;
  commitmentsCount: number;
  commitmentsSumMinor: number;
  approvedRequestCount: number;
  approvedAuditCount: number;
};

async function readSnapshot(db: postgres.Sql, costCenterId: string, requestIds: string[]): Promise<BudgetSnapshot> {
  const [center] = await db<{
    id: string;
    code: string;
    allocated: string;
    committed: string;
  }[]>`
    select id, code, allocated_budget_minor::text as allocated, committed_budget_minor::text as committed
    from cost_centers
    where id = ${costCenterId}
  `;
  const [commitments] = await db<{ count: number; total: string }[]>`
    select count(*)::int as count, coalesce(sum(amount_minor), 0)::text as total
    from financial_commitments
    where cost_center_id = ${costCenterId}
  `;
  const [requests] = await db<{ approved: number }[]>`
    select count(*)::int as approved
    from purchase_requests
    where id = any(${requestIds}::uuid[]) and status = 'APPROVED'
  `;
  const [audits] = await db<{ approved: number }[]>`
    select count(*)::int as approved
    from audit_events
    where request_id = any(${requestIds}::uuid[]) and event_type = 'APPROVED'
  `;
  const allocatedBudgetMinor = Number(center.allocated);
  const committedBudgetMinor = Number(center.committed);
  return {
    costCenterId: center.id,
    costCenterCode: center.code,
    allocatedBudgetMinor,
    committedBudgetMinor,
    availableBudgetMinor: allocatedBudgetMinor - committedBudgetMinor,
    commitmentsCount: commitments.count,
    commitmentsSumMinor: Number(commitments.total),
    approvedRequestCount: requests.approved,
    approvedAuditCount: audits.approved,
  };
}

async function main() {
  if (!isLabEnabled()) {
    throw new Error("Set WORKSHOP_LAB_MODE=enabled to run PH-42 reproduction against the disposable lab.");
  }
  const isolated = process.argv.includes("--isolated");
  const origin = labOrigin();
  const db = postgres(labConnectionString(), {
    max: 2,
    connect_timeout: 3,
    connection: { statement_timeout: 5_000 },
  });

  let costCenterId = CC_ENG_01_ID;
  let costCenterCode = "CC-ENG-01";

  try {
    const health = await apiCall(origin, "/api/health");
    if (health.status !== 200 || health.body?.status !== "ready") {
      throw new Error("Procurement Hub is not ready at " + origin);
    }

    if (isolated) {
      const suffix = crypto.randomUUID().slice(0, 8).toUpperCase();
      costCenterId = crypto.randomUUID();
      costCenterCode = `CC-PH42-${suffix}`;
      await db`
        insert into cost_centers (id, tenant_id, code, name, currency, allocated_budget_minor, committed_budget_minor)
        values (${costCenterId}, ${NORTHSTAR_TENANT_ID}, ${costCenterCode}, 'PH-42 Isolated Budget Scenario', 'USD', ${ALLOCATED_MINOR}, 0)
      `;
    } else {
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
          set allocated_budget_minor = ${ALLOCATED_MINOR}, committed_budget_minor = 0, updated_at = now()
          where id = ${CC_ENG_01_ID}
        `;
      });
    }

    const [requesterCookie, approver1Cookie, approver2Cookie] = await Promise.all([
      login(origin, "northstar-requester"),
      login(origin, "northstar-approver"),
      login(origin, "northstar-approver-2"),
    ]);

    const [reqA, reqB] = await Promise.all([
      apiCall(origin, "/api/purchase-requests", {
        headers: { Cookie: requesterCookie, "Idempotency-Key": "ph42-req-a-" + crypto.randomUUID() },
        body: {
          costCenterId,
          title: "Cloud Security Audit Tooling",
          justification: "Annual enterprise SAST/DAST licensing for Platform Engineering",
          amountMinor: REQUEST_AMOUNT_MINOR,
          currency: "USD",
        },
      }),
      apiCall(origin, "/api/purchase-requests", {
        headers: { Cookie: requesterCookie, "Idempotency-Key": "ph42-req-b-" + crypto.randomUUID() },
        body: {
          costCenterId,
          title: "CI Runner Capacity Expansion",
          justification: "Dedicated isolated build runners for Q4 compliance release",
          amountMinor: REQUEST_AMOUNT_MINOR,
          currency: "USD",
        },
      }),
    ]);

    const idA = reqA.body?.id as string | undefined;
    const idB = reqB.body?.id as string | undefined;
    if (reqA.status !== 201 || reqB.status !== 201 || !idA || !idB) {
      throw new Error("Failed to create synthetic PH-42 purchase requests.");
    }

    const before = await readSnapshot(db, costCenterId, [idA, idB]);
    const barrier = `ph42-${crypto.randomUUID().slice(0, 12)}:2`;

    const [decisionA, decisionB] = await Promise.all([
      apiCall(origin, `/api/purchase-requests/${idA}/decision`, {
        headers: {
          Cookie: approver1Cookie,
          "Idempotency-Key": "ph42-appr-a-" + crypto.randomUUID(),
          "X-Workshop-Sync-Barrier": barrier,
        },
        body: { decision: "APPROVE", reason: "Approved within Q4 security plan" },
      }),
      apiCall(origin, `/api/purchase-requests/${idB}/decision`, {
        headers: {
          Cookie: approver2Cookie,
          "Idempotency-Key": "ph42-appr-b-" + crypto.randomUUID(),
          "X-Workshop-Sync-Barrier": barrier,
        },
        body: { decision: "APPROVE", reason: "Approved for Q4 CI capacity" },
      }),
    ]);

    const after = await readSnapshot(db, costCenterId, [idA, idB]);

    const responses = [
      {
        requestId: idA,
        httpStatus: decisionA.status,
        requestStatus: decisionA.body?.status ?? null,
        errorCode: (decisionA.body?.error as { code?: string } | undefined)?.code ?? null,
      },
      {
        requestId: idB,
        httpStatus: decisionB.status,
        requestStatus: decisionB.body?.status ?? null,
        errorCode: (decisionB.body?.error as { code?: string } | undefined)?.code ?? null,
      },
    ];

    const violatedInvariants: string[] = [];
    if (after.committedBudgetMinor > after.allocatedBudgetMinor || after.committedBudgetMinor !== after.commitmentsSumMinor) {
      violatedInvariants.push("INV-01");
    }
    if (after.availableBudgetMinor < 0) {
      violatedInvariants.push("INV-02");
    }
    if (after.approvedAuditCount !== after.approvedRequestCount) {
      violatedInvariants.push("INV-08");
    }
    if (after.commitmentsCount !== after.approvedRequestCount) {
      violatedInvariants.push("INV-09");
    }

    const sortedStatuses = responses.map((r) => r.httpStatus).sort((a, b) => a - b);
    const loserError = responses.find((r) => r.httpStatus === 409)?.errorCode;
    const passed =
      violatedInvariants.length === 0 &&
      sortedStatuses[0] === 200 &&
      sortedStatuses[1] === 409 &&
      loserError === "INSUFFICIENT_BUDGET" &&
      after.committedBudgetMinor === REQUEST_AMOUNT_MINOR &&
      after.availableBudgetMinor === ALLOCATED_MINOR - REQUEST_AMOUNT_MINOR &&
      after.commitmentsCount === 1 &&
      after.approvedRequestCount === 1 &&
      after.approvedAuditCount === 1;

    const report = {
      source: "live-loopback-ph42",
      scenario: "Concurrent approval of two $7,000 requests against a $10,000 cost center budget",
      status: passed ? "pass" : "fail",
      violatedInvariants,
      httpStatuses: sortedStatuses,
      responses,
      before,
      after,
    };

    console.log(JSON.stringify(report, null, 2));
    if (!passed) process.exitCode = 1;
  } finally {
    if (isolated) {
      await db.begin(async (sql) => {
        const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
          select to_regclass('public.decision_idempotency_keys') is not null as exists
        `;
        if (hasDecisionKeys) {
          await sql`
            delete from decision_idempotency_keys
            where request_id in (select id from purchase_requests where cost_center_id = ${costCenterId})
          `;
        }
        await sql`delete from financial_commitments where cost_center_id = ${costCenterId}`;
        await sql`
          delete from audit_events
          where request_id in (select id from purchase_requests where cost_center_id = ${costCenterId})
        `;
        await sql`delete from purchase_requests where cost_center_id = ${costCenterId}`;
        await sql`delete from cost_centers where id = ${costCenterId}`;
      }).catch(() => {});
    }
    await db.end({ timeout: 3 });
  }
}

try {
  await main();
} catch (error) {
  console.log(
    JSON.stringify({
      source: "live-loopback-ph42",
      status: "blocked",
      message: error instanceof Error ? error.message : "Unable to run PH-42 reproduction.",
    }),
  );
  process.exitCode = 2;
}
