import { isLabEnabled } from "../src/server/db/lab-config.mjs";

export function labOrigin() {
  const url = new URL(process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000");
  if (!isLabEnabled() || url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname)
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("The verifier requires an explicitly enabled loopback workshop lab.");
  }
  return url.origin;
}
