import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";
import { labOrigin } from "./lab-origin";

async function inspectDatabase() {
  if (!isLabEnabled()) throw new Error("The local lab profile is required.");

  const db = postgres(labConnectionString(), {
    max: 1,
    connect_timeout: 3,
    connection: { statement_timeout: 3_000 },
  });
  try {
    const [summary] = await db.begin("read only", async (sql) => {
      const [identityRow] = await sql<{
        database: string;
        postgresVersion: string;
        tenants: number;
        requiredIdentities: number;
      }[]>`
        select current_database() as database, current_setting('server_version') as "postgresVersion",
          count(distinct tenant_id)::int as tenants, count(*)::int as "requiredIdentities"
        from memberships
        where (lab_identity, role) in (
          ('northstar-requester', 'REQUESTER'),
          ('northstar-approver', 'APPROVER'),
          ('northstar-approver-2', 'APPROVER'),
          ('northstar-junior-approver', 'APPROVER'),
          ('northstar-auditor', 'AUDITOR'),
          ('meridian-requester', 'REQUESTER'),
          ('meridian-approver', 'APPROVER')
        )
      `;
      const [centerRow] = await sql<{ costCenters: number }[]>`
        select count(*)::int as "costCenters"
        from cost_centers
        where code in ('CC-ENG-01', 'CC-OPS-01', 'CC-MER-01')
      `;
      return [{ ...identityRow, costCenters: centerRow.costCenters }];
    });
    if (
      summary.database !== "procurement_hub_lab" ||
      summary.tenants !== 2 ||
      summary.requiredIdentities !== 7 ||
      summary.costCenters !== 3
    ) {
      throw new Error("The expected lab seed (tenants, identities, or cost centers) is missing.");
    }
    return summary;
  } finally {
    await db.end({ timeout: 3 });
  }
}

async function inspectApplication() {
  const origin = labOrigin();
  const options: RequestInit = { redirect: "error", signal: AbortSignal.timeout(5_000) };
  const [health, access, budgets] = await Promise.all([
    fetch(new URL("/api/health", origin), options),
    fetch(new URL("/api/purchase-requests", origin), options),
    fetch(new URL("/api/cost-centers", origin), options),
  ]);
  const [healthBody, accessBody, budgetsBody] = await Promise.all([health.json(), access.json(), budgets.json()]);
  if (
    health.status !== 200 ||
    healthBody.status !== "ready" ||
    access.status !== 401 ||
    accessBody.error?.code !== "UNAUTHENTICATED" ||
    budgets.status !== 401 ||
    budgetsBody.error?.code !== "UNAUTHENTICATED"
  ) {
    throw new Error("The app health or session boundary check failed.");
  }
  return {
    healthStatus: health.status,
    unauthenticatedRequestsStatus: access.status,
    unauthenticatedCostCentersStatus: budgets.status,
  };
}

const args = process.argv.slice(2);
const mode = args[0] === "--db-only" ? "database" : "application";
let check = "arguments";
try {
  if (args.length > 1 || (args.length === 1 && mode !== "database")) {
    throw new Error("Usage: lab-doctor.ts [--db-only]");
  }
  check = "database";
  const database = await inspectDatabase();
  check = "application";
  const app = mode === "application" ? await inspectApplication() : undefined;
  console.log(JSON.stringify({ status: "pass", mode, database, app }));
} catch {
  console.log(JSON.stringify({ status: "blocked", mode, check }));
  process.exitCode = 2;
}
