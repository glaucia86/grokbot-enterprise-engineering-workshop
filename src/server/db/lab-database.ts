import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { labConnectionString } from "./lab-config";

let database: ReturnType<typeof drizzle> | undefined;

export function getLabDatabase() {
  database ??= drizzle(postgres(labConnectionString(), {
    max: 2,
    connect_timeout: 3,
    connection: { statement_timeout: 2_500 },
  }));
  return database;
}

export async function checkLabDatabase() {
  await getLabDatabase().execute(sql`select 1`);
}
