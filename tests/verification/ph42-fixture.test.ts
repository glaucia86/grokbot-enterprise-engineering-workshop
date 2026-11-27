import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "vitest";

test("legacy fixture check still reports expected snapshot schema", () => {
  const result = spawnSync(process.execPath, ["scripts/verify-ph42-fixture.ts"], { encoding: "utf8", timeout: 12_000 });
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
