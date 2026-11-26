import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { test } from "vitest";
import { commitFixture, git, run, withFixture } from "./fixture";

test("the check runner preserves attempts and stops after two retries", async () => {
  await withFixture("check-slice.ts", async (repo) => {
    const checks = {
      "VS-00": [
        { id: "smoke", argv: ["{bun}", "-e", "process.exit(3)"], timeoutSeconds: 5 },
        { id: "static", argv: ["{bun}", "-e", "console.log('checked')"], timeoutSeconds: 5 },
      ],
    };
    await Bun.write(join(repo, "engineering/slice-checks.json"), JSON.stringify(checks));
    commitFixture(repo);
    const output = join(repo, "artifacts/verification/VS-00/rehearsal");
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const result = run(repo, "check-slice.ts", "VS-00", "rehearsal");
      assert.equal(result.exitCode, 1, result.stderr.toString());
      const manifest = await Bun.file(join(output, "attempt-" + attempt, "manifest.json")).json();
      assert.equal(manifest.attempt, attempt);
      assert.equal(manifest.candidateSha, git(repo, "rev-parse", "HEAD"));
      assert.equal(manifest.worktreeDirty, false);
      assert.equal(manifest.checks[0].exitCode, 3);
      assert.equal(manifest.checks[1].status, "pass");
    }
    assert.equal(run(repo, "check-slice.ts", "VS-00", "rehearsal").exitCode, 2);
    assert.equal((await readdir(output)).length, 3);
  });
}, 15_000);
