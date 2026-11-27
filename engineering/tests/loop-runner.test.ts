import assert from "node:assert/strict";
import { join } from "node:path";
import { test } from "vitest";
import { commitFixture, run, withFixture } from "./fixture";

test("loop-runner persists state, blocks duplicate failing retries without new hypothesis/diff, and escalates on failure budget", async () => {
  await withFixture("loop-runner.ts", async (repo) => {
    await Bun.write(join(repo, "app.ts"), "export const ok = false;\n");
    commitFixture(repo);

    const init = run(
      repo,
      "loop-runner.ts",
      "init",
      "--run-id",
      "ph42-loop",
      "--issue",
      "PH-42",
      "--max-iterations",
      "3",
      "--max-consecutive-failures",
      "2",
    );
    assert.equal(init.exitCode, 0, init.stderr.toString());

    const fail1 = run(
      repo,
      "loop-runner.ts",
      "run",
      "--run-id",
      "ph42-loop",
      "--stage",
      "reproduce",
      "--hypothesis",
      "Missing row lock on cost center",
      "--cmd",
      `${process.execPath} -e "process.exit(1)"`,
    );
    assert.equal(fail1.exitCode, 1, fail1.stderr.toString());

    // Anti-spin guard: identical failing command + same hypothesis + unchanged diff must be rejected (exit 2)
    const repeat = run(
      repo,
      "loop-runner.ts",
      "run",
      "--run-id",
      "ph42-loop",
      "--stage",
      "reproduce",
      "--hypothesis",
      "Missing row lock on cost center",
      "--cmd",
      `${process.execPath} -e "process.exit(1)"`,
    );
    assert.equal(repeat.exitCode, 2);
    assert.match(repeat.stderr.toString(), /Anti-spin guard/);

    // Different hypothesis triggers second consecutive failure -> escalates automatically
    const fail2 = run(
      repo,
      "loop-runner.ts",
      "run",
      "--run-id",
      "ph42-loop",
      "--stage",
      "fix",
      "--hypothesis",
      "Alternative premise: missing check constraint",
      "--cmd",
      `${process.execPath} -e "process.exit(1)"`,
    );
    assert.equal(fail2.exitCode, 1);

    const state = await Bun.file(join(repo, "artifacts/loop/ph42-loop/state.json")).json();
    assert.equal(state.status, "escalated");
    assert.equal(state.iterations.length, 2);
    assert.match(state.escalationReason, /Consecutive failure budget exhausted/);

    const handoff = await Bun.file(join(repo, "artifacts/loop/ph42-loop/handoff.md")).text();
    assert.match(handoff, /Loop Engineering Handoff — PH-42/);
    assert.match(handoff, /Human escalation required/);
  });
}, 20_000);

test("loop-runner scope-expansion guard blocks unauthorized modifications to protected verifier files", async () => {
  await withFixture("loop-runner.ts", async (repo) => {
    await Bun.write(join(repo, "eslint.config.ts"), "export default [];\n");
    commitFixture(repo);

    assert.equal(run(repo, "loop-runner.ts", "init", "--run-id", "scope-test", "--issue", "PH-42").exitCode, 0);
    await Bun.write(join(repo, "eslint.config.ts"), "// weakened rule\nexport default [];\n");

    const blocked = run(
      repo,
      "loop-runner.ts",
      "run",
      "--run-id",
      "scope-test",
      "--stage",
      "verify",
      "--hypothesis",
      "Testing scope guard",
      "--cmd",
      `${process.execPath} -e "process.exit(0)"`,
    );
    assert.equal(blocked.exitCode, 2);
    assert.match(blocked.stderr.toString(), /Scope-expansion guard tripped/);
  });
}, 20_000);
