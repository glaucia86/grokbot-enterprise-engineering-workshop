import { join } from "node:path";
import { git, runIdPattern, verificationDir, writeManifest } from "./runtime";

type JsonRecord = Record<string, unknown>;
const statuses = ["pass", "fail", "blocked", "not-run"];
const stageIds = ["launch", "doctor", "drive", "evidence", "cleanup"];
const checkIds = [
  "static", "typecheck", "unit", "http-postgres", "vs-00-http-smoke", "browser",
  "ph42-fixture", "ph42-live-invariant", "harness-contract", "idempotency-migration",
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

function outcomeRows(value: unknown, ids: string[]) {
  return (Array.isArray(value) ? value : []).map(record).flatMap((row) => {
    const id = member(row.id, ids);
    const status = member(row.status, statuses);
    return id && status ? [{
      id, status, durationSeconds: nonnegative(row.durationSeconds),
      exitCode: row.exitCode === null || Number.isInteger(row.exitCode) ? row.exitCode : undefined,
    }] : [];
  });
}

function observation(value: unknown, source: string) {
  const row = record(value);
  const httpStatuses = Array.isArray(row.httpStatuses)
    ? row.httpStatuses.filter((code) => Number.isInteger(code) && code >= 100 && code <= 599).slice(0, 2)
    : undefined;
  return {
    source,
    status: member(row.status, statuses),
    httpStatuses,
    sameRequest: typeof row.sameRequest === "boolean" ? row.sameRequest : undefined,
    requestCount: nonnegative(row.requestCount),
    creationEventCount: nonnegative(row.creationEventCount),
  };
}

export function sanitizeEvidence(lifecycle: JsonRecord, attempt: JsonRecord | undefined, candidateSha: string, runId: string) {
  if (!shaPattern.test(candidateSha) || !runIdPattern.test(runId)) throw new Error("Invalid revision or run ID.");
  for (const manifest of [lifecycle, ...(attempt ? [attempt] : [])]) {
    if (manifest.schemaVersion !== 1 || manifest.slice !== "VS-05" || manifest.runId !== runId
      || manifest.candidateSha !== candidateSha || manifest.worktreeDirty !== false) {
      throw new Error("Evidence must identify the exact, clean VS-05 candidate.");
    }
  }
  if (typeof lifecycle.candidateTree !== "string" || !shaPattern.test(lifecycle.candidateTree)) {
    throw new Error("Missing candidate tree.");
  }
  const status = member(lifecycle.status, statuses);
  if (!status || (status === "pass" && attempt?.status !== "pass")) throw new Error("Missing verification outcome.");
  const versions = record(lifecycle.toolVersions);
  const observations = record(lifecycle.observations);
  return {
    schemaVersion: 1, slice: "VS-05", runId, candidateSha, candidateTree: lifecycle.candidateTree,
    status, worktreeDirty: false,
    toolVersions: { bun: typeof versions.bun === "string" && /^\d+\.\d+\.\d+$/.test(versions.bun) ? versions.bun : undefined },
    stages: outcomeRows(lifecycle.stages, stageIds),
    checks: outcomeRows(attempt?.checks, checkIds),
    observations: {
      liveApi: observation(observations.liveApi, "live-loopback"),
      syntheticSnapshot: observation(observations.syntheticSnapshot, "synthetic-snapshot"),
    },
  };
}

if (import.meta.main) {
  const [candidateSha, runId] = Bun.argv.slice(2);
  if (!candidateSha || !runId || !runIdPattern.test(runId) || git("rev-parse", "HEAD") !== candidateSha) {
    throw new Error("The checkout must match the requested candidate revision and the run ID must be valid.");
  }
  const run = join(verificationDir, "VS-05", runId);
  const lifecycle = Bun.file(join(run, "lifecycle/manifest.json"));
  const attempt = Bun.file(join(run, "attempt-0/manifest.json"));
  const evidence = sanitizeEvidence(await lifecycle.json(), await attempt.exists() ? await attempt.json() : undefined, candidateSha, runId);
  await writeManifest(join(run, "ci-evidence.json"), evidence);
}
