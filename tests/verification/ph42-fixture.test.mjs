import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("PH-42 reports a failing synthetic observation with scoped duplicate counts", () => {
  const result = spawnSync(process.execPath, ["--env-file-if-exists=.env", "scripts/verify-ph42-fixture.mjs"], {
    encoding: "utf8",
    timeout: 12_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 1, result.stdout);
  assert.deepEqual(JSON.parse(result.stdout), {
    source: "synthetic-snapshot",
    status: "fail",
    httpStatuses: [201, 201],
    sameRequest: false,
    requestCount: 2,
    creationEventCount: 2,
  });
});
