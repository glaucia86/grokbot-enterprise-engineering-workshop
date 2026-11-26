import assert from "node:assert/strict";
import { test } from "bun:test";

test("PH-42 reports a failing synthetic observation with scoped duplicate counts", () => {
  const result = Bun.spawnSync([process.execPath, "scripts/verify-ph42-fixture.ts"], { timeout: 12_000 });
  assert.equal(result.exitCode, 1, result.stdout.toString());
  assert.deepEqual(JSON.parse(result.stdout.toString()), {
    source: "synthetic-snapshot",
    status: "fail",
    httpStatuses: [201, 201],
    sameRequest: false,
    requestCount: 2,
    creationEventCount: 2,
  });
});
