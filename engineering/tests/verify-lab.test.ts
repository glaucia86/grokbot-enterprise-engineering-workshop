import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "vitest";
import { commitFixture, run, withFixture } from "./fixture";

test("a blocked launch writes evidence and refuses to reuse the run ID", async () => {
  await withFixture("verify-lab.ts", async (repo) => {
    commitFixture(repo);
    const args = ["--run-id", "missing-postgres", "--postgres-bin", join(repo, "unavailable")];
    const result = run(repo, "verify-lab.ts", ...args);
    assert.equal(result.exitCode, 2, result.stderr.toString());
    const manifest = Bun.file(join(repo, "artifacts/verification/VS-04/missing-postgres/lifecycle/manifest.json"));
    const original = await manifest.text();
    const parsed: { status: string; stages: { id: string; status: string }[] } = JSON.parse(original);
    assert.equal(parsed.status, "blocked");
    assert.deepEqual(Object.fromEntries(parsed.stages.map(({ id, status }) => [id, status])), {
      launch: "blocked", doctor: "not-run", drive: "not-run", evidence: "not-run", cleanup: "pass",
    });
    assert.equal(run(repo, "verify-lab.ts", ...args).exitCode, 2);
    assert.equal(await manifest.text(), original);
  });
}, 15_000);
