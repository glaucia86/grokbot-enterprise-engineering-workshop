// 05 — Minimal TypeScript Verification Harness Template
// Adapt commands, ports, and DB snapshot queries to your repository.

import { mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

type CheckResult = {
  id: string;
  command: string[];
  exitCode: number | null;
  status: "pass" | "fail" | "blocked";
  durationSeconds: number;
};

function runGit(args: string[]): string {
  const res = spawnSync("git", args, { encoding: "utf8" });
  if (res.status !== 0) throw new Error(`git ${args.join(" ")} failed`);
  return res.stdout.trim();
}

function runCheck(id: string, command: string[], timeoutMs = 60_000): CheckResult {
  const start = performance.now();
  const res = spawnSync(command[0], command.slice(1), { encoding: "utf8", timeout: timeoutMs });
  const durationSeconds = Math.round(performance.now() - start) / 1000;
  return {
    id,
    command,
    exitCode: res.status,
    status: res.status === 0 ? "pass" : res.status === null ? "blocked" : "fail",
    durationSeconds,
  };
}

export async function runVerificationHarness(runId: string, checks: { id: string; command: string[] }[]) {
  const candidateSha = runGit(["rev-parse", "HEAD"]);
  const worktreeDirty = Boolean(runGit(["status", "--porcelain"]));
  const outDir = join(process.cwd(), "artifacts", "verification", runId);
  await mkdir(outDir, { recursive: true });

  const results: CheckResult[] = [];
  try {
    // 1. Launch isolated DB + app (add your owned-resource lifecycle hooks here)
    // 2. Run read-only doctor check
    // 3. Drive configured deterministic & runtime checks
    for (const check of checks) {
      results.push(runCheck(check.id, check.command));
    }
  } finally {
    // 4. Always tear down ONLY owned resources; never delete `outDir`!
  }

  const allPassed = results.every((r) => r.status === "pass") && !worktreeDirty;
  const manifest = {
    schemaVersion: 1,
    runId,
    candidateSha,
    worktreeDirty,
    status: allPassed ? "pass" : "fail",
    humanReview: "pending",
    checks: results,
    finishedAt: new Date().toISOString(),
  };

  await writeFile(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  await writeFile(
    join(outDir, "summary.md"),
    `# Verification Summary (${runId})\n\n- Verdict: **${manifest.status}**\n- Commit: \`${candidateSha}\`\n- Dirty: \`${worktreeDirty}\`\n`,
  );
  return manifest;
}
