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
const initialMigration = "0000_tenant_scoped_procurement.sql";
const scopedConstraint = "purchase_requests_tenant_key_unique";
const clientOptions = { max: 1, connect_timeout: 3, connection: { statement_timeout: 5_000 } };

async function withBaseline(
  { legacy }: { legacy: boolean },
  verify: (sql: Sql, upgrade: () => Promise<void>) => Promise<void>,
) {
  assert.ok(isLabEnabled(), "Migration tests require the disposable workshop lab.");
  const target = new URL(labConnectionString());
  const admin = postgres(target.toString(), clientOptions);
  const fixtureName = "workshop_vs05_" + crypto.randomUUID().replaceAll("-", "");
  const baseline = await mkdtemp(join(tmpdir(), "workshop-vs05-baseline-"));
  const targetFolder = await mkdtemp(join(tmpdir(), "workshop-vs05-target-"));
  try {
    await mkdir(join(baseline, "meta"));
    await mkdir(join(targetFolder, "meta"));
    const journal = JSON.parse(await readFile(join(migrationsFolder, "meta", "_journal.json"), "utf8"));
    await writeFile(join(baseline, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 1) }));
    await copyFile(join(migrationsFolder, initialMigration), join(baseline, initialMigration));
    await writeFile(join(targetFolder, "meta", "_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, 2) }));
    await copyFile(join(migrationsFolder, initialMigration), join(targetFolder, initialMigration));
    await copyFile(join(migrationsFolder, "0001_ensure_tenant_idempotency.sql"), join(targetFolder, "0001_ensure_tenant_idempotency.sql"));

    await admin`create database ${admin(fixtureName)}`;
    target.pathname = "/" + fixtureName;
    const fixture = postgres(target.toString(), clientOptions);
    try {
      const database = drizzle(fixture);
      await migrate(database, { migrationsFolder: baseline });
      if (legacy) {
        // Model the old schema only inside this private fixture database.
        await fixture`alter table purchase_requests drop constraint ${fixture(scopedConstraint)}`;
      }
      const legacySeed = `
        INSERT INTO tenants (id, name) VALUES
          ('10000000-0000-4000-8000-000000000001', 'Northstar Industries'),
          ('10000000-0000-4000-8000-000000000002', 'Meridian Retail')
        ON CONFLICT (id) DO NOTHING;
        INSERT INTO users (id, display_name) VALUES
          ('20000000-0000-4000-8000-000000000001', 'Northstar Requester'),
          ('20000000-0000-4000-8000-000000000002', 'Northstar Alternate Requester'),
          ('20000000-0000-4000-8000-000000000005', 'Meridian Requester')
        ON CONFLICT (id) DO NOTHING;
        INSERT INTO memberships (tenant_id, user_id, role, lab_identity) VALUES
          ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'REQUESTER', 'northstar-requester'),
          ('10000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', 'REQUESTER', 'northstar-requester-alt'),
          ('10000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000005', 'REQUESTER', 'meridian-requester')
        ON CONFLICT (tenant_id, user_id) DO NOTHING;
      `;
      await fixture.unsafe(legacySeed).simple();
      await verify(fixture, () => migrate(database, { migrationsFolder: targetFolder }));
    } finally {
      await fixture.end({ timeout: 3 });
      await admin`drop database ${admin(fixtureName)}`;
    }
  } finally {
    await admin.end({ timeout: 3 });
    await rm(baseline, { recursive: true, force: true });
    await rm(targetFolder, { recursive: true, force: true });
  }
}

function createPurchase(sql: Sql, identity: string) {
  return sql`
    with created as (
      insert into purchase_requests
        (tenant_id, requester_id, title, justification, amount_minor, currency, idempotency_key, request_hash)
      select tenant_id, user_id, 'Gloves', 'Warehouse supplies', 1250, 'USD', 'shared-order', 'fixture'
      from memberships where lab_identity = ${identity}
      returning tenant_id, id, requester_id
    )
    insert into audit_events (tenant_id, request_id, actor_id, event_type)
      select tenant_id, id, requester_id, 'CREATED' from created
  `;
}

async function snapshot(sql: Sql) {
  return {
    requests: [...await sql`select * from purchase_requests order by id`].map(row => ({ ...row })),
    events: [...await sql`select * from audit_events order by id`].map(row => ({ ...row })),
  };
}

async function migrationCount(sql: Sql) {
  const [result] = await sql<{ count: number }[]>`select count(*)::int as count from drizzle.__drizzle_migrations`;
  return result.count;
}

test("the migration installs tenant-scoped uniqueness without changing existing requests or audit events", async () => {
  await withBaseline({ legacy: true }, async (sql, upgrade) => {
    await createPurchase(sql, "northstar-requester");
    await createPurchase(sql, "meridian-requester");
    const before = await snapshot(sql);
    assert.equal(before.requests.length, 2);
    assert.equal(before.events.length, 2);

    await upgrade();

    await assert.rejects(createPurchase(sql, "northstar-requester-alt"), {
      code: "23505",
      constraint_name: scopedConstraint,
    });
    assert.deepEqual(await snapshot(sql), before);
    assert.equal(await migrationCount(sql), 2);
  });
});

test("the migration refuses legacy duplicates and preserves both requests and audit events", async () => {
  await withBaseline({ legacy: true }, async (sql, upgrade) => {
    await createPurchase(sql, "northstar-requester");
    await createPurchase(sql, "northstar-requester-alt");
    const before = await snapshot(sql);
    assert.equal(before.requests.length, 2);
    assert.equal(before.events.length, 2);

    await assert.rejects(upgrade, error => {
      const cause = error instanceof Error ? error.cause ?? error : error;
      return cause instanceof postgres.PostgresError && cause.code === "23505" && cause.message ===
        "The lab contains duplicate tenant/idempotency keys. Reconcile the duplicates before retrying the migration.";
    });

    assert.deepEqual(await snapshot(sql), before);
    assert.equal(await migrationCount(sql), 1);
  });
});

test("an already protected baseline can upgrade and rerun without changing its data", async () => {
  await withBaseline({ legacy: false }, async (sql, upgrade) => {
    await createPurchase(sql, "northstar-requester");
    const before = await snapshot(sql);

    await upgrade();
    await upgrade();

    assert.deepEqual(await snapshot(sql), before);
    assert.equal(await migrationCount(sql), 2);
    await assert.rejects(createPurchase(sql, "northstar-requester-alt"), {
      code: "23505",
      constraint_name: scopedConstraint,
    });
  });
});
