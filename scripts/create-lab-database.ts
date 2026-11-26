import postgres from "postgres";
import { isLabEnabled, labConnectionString } from "../src/server/db/lab-config";

if (!isLabEnabled()) throw new Error("Enable the workshop lab profile before creating its database.");
const target = new URL(labConnectionString());
target.pathname = "/postgres";
const client = postgres(target.toString(), { max: 1, connect_timeout: 3 });
try {
  await client`create database procurement_hub_lab`;
} finally {
  await client.end({ timeout: 3 });
}
