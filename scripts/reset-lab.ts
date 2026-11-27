import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";

if (!isLabEnabled()) {
  throw new Error("Enable WORKSHOP_LAB_MODE=enabled before resetting disposable lab state.");
}

const seed = await Bun.file(new URL("seed-lab.sql", import.meta.url)).text();
const db = postgres(labConnectionString(), { max: 1, connect_timeout: 3, connection: { statement_timeout: 10_000 } });

try {
  await db.begin(async (sql) => {
    const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
      select to_regclass('public.decision_idempotency_keys') is not null as exists
    `;
    if (hasDecisionKeys) await sql`delete from decision_idempotency_keys`;
    await sql`delete from financial_commitments`;
    await sql`delete from audit_events`;
    await sql`delete from purchase_requests`;
    await sql`delete from lab_sessions`;
    await sql`delete from cost_centers`;
    await sql.unsafe(seed).simple();
  });
  console.log("Disposable lab data reset to clean seeded baseline.");
} finally {
  await db.end({ timeout: 3 });
}
