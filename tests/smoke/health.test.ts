import assert from "node:assert/strict";
import { test } from "vitest";

test("Procurement Hub health confirms a live lab database", async () => {
  const base = process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000";
  const response = await fetch(new URL("/api/health", base), {
    signal: AbortSignal.timeout(8_000),
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ready" });
});
