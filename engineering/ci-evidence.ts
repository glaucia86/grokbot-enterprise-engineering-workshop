import { join } from "node:path";
import { git, runIdPattern, verificationDir, writeManifest } from "./runtime";

type JsonRecord = Record<string, unknown>;
const statuses = ["pass", "fail", "blocked", "not-run"];
const stageIds = ["launch", "doctor", "drive", "evidence", "cleanup"];
const checkIds = [
  "static", "typecheck", "architecture", "unit", "properties", "harness-contract",
  "http-smoke", "http-postgres-baseline", "submission-concurrency", "browser",
  "approval-concurrency", "security-regressions", "migrations", "ph42-live-approval",
];
const shaPattern = /^[a-f0-9]{40}$/;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function member(value: unknown, allowed: string[]) {
  return typeof value === "string" && allowed.includes(value) ? value : undefined;
}

function nonnegative(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function finiteInteger(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) ? value : undefined;
}

function outcomeRows(value: unknown, ids: string[]) {
  return (Array.isArray(value) ? value : []).map(record).flatMap((row) => {
    const id = member(row.id, ids);
    const status = member(row.status, statuses);
    return id && status ? [{
      id,
      status,
      durationSeconds: nonnegative(row.durationSeconds),
      exitCode: row.exitCode === null || Number.isInteger(row.exitCode) ? row.exitCode : undefined,
    }] : [];
  });
}

function sanitizeBudget(value: unknown) {
  const row = record(value);
  return {
    allocatedBudgetMinor: nonnegative(row.allocatedBudgetMinor),
    committedBudgetMinor: finiteInteger(row.committedBudgetMinor),
    availableBudgetMinor: finiteInteger(row.availableBudgetMinor),
    commitmentsCount: nonnegative(row.commitmentsCount),
    approvedRequestCount: nonnegative(row.approvedRequestCount),
    approvedAuditCount: nonnegative(row.approvedAuditCount),
  };
}

export function sanitizeEvidence(lifecycle: JsonRecord, attempt: JsonRecord | undefined, candidateSha: string, runId: string) {
  if (!shaPattern.test(candidateSha) || !runIdPattern.test(runId)) throw new Error("Invalid revision or run ID.");
  const slice = member(lifecycle.slice, ["solution", "VS-05"]);
  if (!slice) throw new Error("Evidence must come from the solution or VS-05 verification slice.");

  for (const manifest of [lifecycle, ...(attempt ? [attempt] : [])]) {
    if (
      (manifest.schemaVersion !== 1 && manifest.schemaVersion !== 2) ||
      manifest.slice !== slice ||
      manifest.runId !== runId ||
      manifest.candidateSha !== candidateSha ||
      manifest.worktreeDirty !== false
    ) {
      throw new Error("Evidence must identify the exact, clean solution candidate.");
    }
  }
  if (typeof lifecycle.candidateTree !== "string" || !shaPattern.test(lifecycle.candidateTree)) {
    throw new Error("Missing candidate tree.");
  }
  const status = member(lifecycle.status, statuses);
  if (!status || (status === "pass" && attempt?.status !== "pass")) throw new Error("Missing verification outcome.");
  const versions = record(lifecycle.toolVersions);
  const observations = record(lifecycle.observations);
  const ph42 = record(observations.ph42Approval);
  const httpStatuses = Array.isArray(ph42.httpStatuses)
    ? ph42.httpStatuses.filter((code) => Number.isInteger(code) && code >= 100 && code <= 599).slice(0, 4)
    : undefined;
  const violatedInvariants = Array.isArray(ph42.violatedInvariants)
    ? ph42.violatedInvariants.filter((item): item is string => typeof item === "string" && /^INV-\d\d$/.test(item))
    : undefined;

  return {
    schemaVersion: 2,
    slice,
    runId,
    candidateSha,
    candidateTree: lifecycle.candidateTree,
    status,
    worktreeDirty: false,
    toolVersions: {
      bun: typeof versions.bun === "string" && /^\d+\.\d+\.\d+$/.test(versions.bun) ? versions.bun : undefined,
    },
    stages: outcomeRows(lifecycle.stages, stageIds),
    checks: outcomeRows(attempt?.checks, checkIds),
    observations: {
      ph42Approval: {
        status: member(ph42.status, statuses),
        httpStatuses,
        violatedInvariants,
        before: sanitizeBudget(ph42.before),
        after: sanitizeBudget(ph42.after),
      },
    },
  };
}

if (import.meta.main) {
  const [candidateSha, runId, sliceArg] = Bun.argv.slice(2);
  const slice = sliceArg ?? "solution";
  if (!candidateSha || !runId || !runIdPattern.test(runId) || git("rev-parse", "HEAD") !== candidateSha) {
    throw new Error("The checkout must match the requested candidate revision and the run ID must be valid.");
  }
  const run = join(verificationDir, slice, runId);
  const lifecycle = Bun.file(join(run, "lifecycle/manifest.json"));
  const attempt = Bun.file(join(run, "attempt-0/manifest.json"));
  const evidence = sanitizeEvidence(
    await lifecycle.json(),
    await attempt.exists() ? await attempt.json() : undefined,
    candidateSha,
    runId,
  );
  await writeManifest(join(run, "ci-evidence.json"), evidence);
}
