import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config.mjs";

if (!isLabEnabled()) {
  throw new Error("Enable WORKSHOP_LAB_MODE for the disposable lab before initializing it.");
}

const migrationsFolder = fileURLToPath(new URL("../drizzle", import.meta.url));
const seed = await readFile(new URL("seed-lab.sql", import.meta.url), "utf8");
const client = postgres(labConnectionString(), {
  max: 2,
  connect_timeout: 3,
  connection: { statement_timeout: 10_000 },
});

try {
  // Hold the lock across migration and seed, including commits on the working connection.
  const connection = await client.reserve();
  try {
    await connection`select pg_advisory_lock(105000, 1)`;
    await migrate(drizzle(client), { migrationsFolder });
    await client.begin((transaction) => transaction.unsafe(seed).simple());
  } finally {
    await connection`select pg_advisory_unlock(105000, 1)`;
    await connection.release();
  }
  console.log("Lab migrations and synthetic identities are ready.");
} finally {
  await client.end({ timeout: 5 });
}
