import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let database: ReturnType<typeof drizzle> | undefined;

function connectToLab() {
  const connectionString = process.env.WORKSHOP_DATABASE_URL;
  if (!connectionString) {
    throw new Error("The lab database connection is missing.");
  }

  const target = new URL(connectionString);
  if (
    target.protocol !== "postgresql:" ||
    !["127.0.0.1", "localhost"].includes(target.hostname) ||
    target.pathname !== "/procurement_hub_lab"
  ) {
    throw new Error("Use a loopback connection to the disposable lab database.");
  }

  return drizzle(postgres(connectionString, {
    max: 2,
    connect_timeout: 3,
    connection: { statement_timeout: 2_500 },
  }));
}

export async function checkLabDatabase() {
  database ??= connectToLab();
  await database.execute(sql`select 1`);
}
