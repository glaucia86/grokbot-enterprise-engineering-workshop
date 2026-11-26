import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { bun, elapsedSeconds, fileInfo, git, relativePath, runIdPattern, spawnLogged, verificationDir, writeManifest } from "./runtime";

type Check = { id: string; criteria?: string[]; argv: string[]; timeoutSeconds: number };
type Definition = Check[] | { base: string; checks: Check[] };
type CheckStatus = "pass" | "fail" | "blocked";
const maxAttempts = 3;

function checksFor(definitions: Record<string, Definition>, slice: string): Check[] {
  const definition = definitions[slice];
  if (!definition) return [];
  if (Array.isArray(definition)) return definition;
  return [...checksFor(definitions, definition.base), ...definition.checks];
}

async function reserveAttempt(run: string) {
  await mkdir(run, { recursive: true });
  for (let index = 0; index < maxAttempts; index += 1) {
    const directory = join(run, "attempt-" + index);
    if (!(await fileInfo(directory))) {
      await mkdir(directory);
      return { index, directory };
    }

    const file = Bun.file(join(directory, "manifest.json"));
    if (!(await file.exists())) throw new Error("Unfinished attempt at " + relativePath(directory));
    const previous: { status: CheckStatus; worktreeDirty: boolean } = await file.json();
    if (previous.status === "pass" && !previous.worktreeDirty) throw new Error("Checks already passed for this run.");
  }
  throw new Error("Attempt budget exhausted. Inspect the prior evidence and seek human review.");
}

async function execute(check: Check, attempt: string) {
  const command = check.argv.map((arg) => arg === "{bun}" ? bun : arg);
  const log = join(attempt, check.id + ".log");
  const startedAt = new Date().toISOString();
  const start = performance.now();
  let exitCode: number | null = null;
  let status: CheckStatus = "blocked";
  try {
    const child = await spawnLogged(command, log, { timeout: check.timeoutSeconds * 1_000 });
    exitCode = await child.exited;
    status = exitCode === 0 ? "pass" : "fail";
  } catch {
    await Bun.write(log, "Unable to start check.\n");
  }
  return {
    id: check.id,
    criteria: check.criteria ?? [],
    command,
    status,
    exitCode,
    startedAt,
    finishedAt: new Date().toISOString(),
    durationSeconds: elapsedSeconds(start),
    artifactPaths: [relativePath(log)],
  };
}

async function main() {
  const [slice, runId, ...extra] = Bun.argv.slice(2);
  const definitions: Record<string, Definition> = await Bun.file(new URL("slice-checks.json", import.meta.url)).json();
  const checks = slice ? checksFor(definitions, slice) : [];
  if (!checks.length || !runId || !runIdPattern.test(runId) || extra.length) {
    throw new Error("Expected a configured slice and a run ID containing lowercase letters, digits or hyphens.");
  }

  const candidateSha = git("rev-parse", "HEAD");
  const dirty = Boolean(git("status", "--porcelain"));
  const { index, directory } = await reserveAttempt(join(verificationDir, slice, runId));
  const results = [];
  for (const check of checks) results.push(await execute(check, directory));
  const statuses = new Set(results.map((result) => result.status));
  const status = statuses.has("blocked") ? "blocked" : statuses.has("fail") ? "fail" : "pass";
  const worktreeDirty = dirty || Boolean(git("status", "--porcelain")) || git("rev-parse", "HEAD") !== candidateSha;
  const manifest = {
    schemaVersion: 1,
    slice,
    runId,
    attempt: index,
    candidateSha,
    worktreeDirty,
    environment: "isolated-lab",
    toolVersions: { bun: Bun.version, git: git("--version") },
    status,
    humanReview: "pending",
    checks: results,
  };
  const path = join(directory, "manifest.json");
  await writeManifest(path, manifest);
  console.log(relativePath(path));
  return status === "pass" && !worktreeDirty ? 0 : 1;
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : "The check runner could not finish.");
  process.exitCode = 2;
}
