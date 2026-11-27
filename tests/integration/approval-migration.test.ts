import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "vitest";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres, { type Sql } from "postgres";
import { isLabEnabled, labConnectionString } from "../../src/server/db/lab-config";

const migrationsFolder = fileURLToPath(new URL("../../drizzle/", import.meta.url));
const clientOptions = { max: 1, connect_timeout: 3, connection: { statement_timeout: 5_000 } };

const NORTHSTAR_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";
const REQUESTER_ID = "20000000-0000-4000-8000-000000000001";
const APPROVER_ID = "20000000-0000-4000-8000-000000000003";

async function withStarterSchema(verify: (sql: Sql, upgrade: () => Promise<void>) => Promise<void>) {
  assert.ok(isLabEnabled(), "Migration tests require the disposable workshop lab.");
  const target = new URL(labConnectionString());
  const admin = postgres(target.toString(), clientOptions);
  const fixtureName = "workshop_ph42_mig_" + crypto.randomUUID().replaceAll("-", "");
  const baseline = await mkdtemp(join(tmpdir(), "workshop-ph42-base-"));
  try {
    await mkdir(join(baseline, "meta"));
    const journal = JSON.parse(await readFile(join(migrationsFolder, "meta", "_journal.json"), "utf8"));
    await writeFile(join(baseline, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 3) }));
    for (const file of [
      "0000_tenant_scoped_procurement.sql",
      "0001_ensure_tenant_idempotency.sql",
      "0002_cost_centers_and_commitments.sql",
    ]) {
      await copyFile(join(migrationsFolder, file), join(baseline, file));
    }

    await admin`create database ${admin(fixtureName)}`;
    target.pathname = "/" + fixtureName;
    const fixture = postgres(target.toString(), clientOptions);
    try {
      const database = drizzle(fixture);
      await migrate(database, { migrationsFolder: baseline });
      const seed = await readFile(new URL("../../scripts/seed-lab.sql", import.meta.url), "utf8");
      await fixture.unsafe(seed).simple();
      await verify(fixture, () => migrate(database, { migrationsFolder }));
    } finally {
      await fixture.end({ timeout: 3 });
      await admin`drop database ${admin(fixtureName)}`;
    }
  } finally {
    await admin.end({ timeout: 3 });
    await rm(baseline, { recursive: true, force: true });
  }
}

test("migration 0003 installs budget CHECK, commitment uniqueness, and decision_idempotency_keys cleanly and idempotently", async () => {
  await withStarterSchema(async (sql, upgrade) => {
    await upgrade();
    await upgrade();

    // DB CHECK must reject overspent balance directly in PostgreSQL (SQLSTATE 23514)
    await assert.rejects(
      sql`update cost_centers set committed_budget_minor = 1400000 where id = ${CC_ENG_01_ID}`,
      (error: unknown) => error instanceof postgres.PostgresError && error.code === "23514",
    );

    // DB CHECK must reject negative committed balance
    await assert.rejects(
      sql`update cost_centers set committed_budget_minor = -1 where id = ${CC_ENG_01_ID}`,
      (error: unknown) => error instanceof postgres.PostgresError && error.code === "23514",
    );

    // DB UNIQUE must reject duplicate financial commitments for the same request (SQLSTATE 23505)
    const reqId = crypto.randomUUID();
    await sql`
      insert into purchase_requests (
        id, tenant_id, cost_center_id, requester_id, title, justification,
        amount_minor, currency, status, idempotency_key, request_hash
      ) values (
        ${reqId}, ${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${REQUESTER_ID},
        'Tooling', 'Test', 500000, 'USD', 'APPROVED', 'k-mig-1', 'h-mig-1'
      )
    `;
    await sql`
      insert into financial_commitments (tenant_id, cost_center_id, request_id, amount_minor, currency, committed_by_actor_id)
      values (${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${reqId}, 500000, 'USD', ${APPROVER_ID})
    `;
    await assert.rejects(
      sql`
        insert into financial_commitments (tenant_id, cost_center_id, request_id, amount_minor, currency, committed_by_actor_id)
        values (${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${reqId}, 500000, 'USD', ${APPROVER_ID})
      `,
      (error: unknown) => error instanceof postgres.PostgresError && error.code === "23505",
    );
  });
});

test("migration 0003 refuses an overspent legacy cost center (SQLSTATE 23514) and preserves historical rows", async () => {
  await withStarterSchema(async (sql, upgrade) => {
    await sql`update cost_centers set committed_budget_minor = 1400000 where id = ${CC_ENG_01_ID}`;
    const before = [...(await sql`select id, allocated_budget_minor, committed_budget_minor from cost_centers order by id`)];

    await assert.rejects(upgrade, (error: unknown) => {
      const cause = error instanceof Error ? error.cause ?? error : error;
      return cause instanceof postgres.PostgresError && cause.code === "23514";
    });

    const after = [...(await sql`select id, allocated_budget_minor, committed_budget_minor from cost_centers order by id`)];
    assert.deepEqual(after, before);
  });
});

test("migration 0003 refuses duplicate financial commitments (SQLSTATE 23505) and preserves historical rows", async () => {
  await withStarterSchema(async (sql, upgrade) => {
    const reqId = crypto.randomUUID();
    await sql`
      insert into purchase_requests (
        id, tenant_id, cost_center_id, requester_id, title, justification,
        amount_minor, currency, status, idempotency_key, request_hash
      ) values (
        ${reqId}, ${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${REQUESTER_ID},
        'Dup Commitment', 'Legacy defect', 400000, 'USD', 'APPROVED', 'k-dup-c', 'h-dup-c'
      )
    `;
    for (let i = 0; i < 2; i++) {
      await sql`
        insert into financial_commitments (tenant_id, cost_center_id, request_id, amount_minor, currency, committed_by_actor_id)
        values (${NORTHSTAR_TENANT_ID}, ${CC_ENG_01_ID}, ${reqId}, 400000, 'USD', ${APPROVER_ID})
      `;
    }
    const [{ count: beforeCount }] = await sql<{ count: number }[]>`select count(*)::int as count from financial_commitments`;
    assert.equal(beforeCount, 2);

    await assert.rejects(upgrade, (error: unknown) => {
      const cause = error instanceof Error ? error.cause ?? error : error;
      return cause instanceof postgres.PostgresError && cause.code === "23505";
    });

    const [{ count: afterCount }] = await sql<{ count: number }[]>`select count(*)::int as count from financial_commitments`;
    assert.equal(afterCount, 2);
  });
});
