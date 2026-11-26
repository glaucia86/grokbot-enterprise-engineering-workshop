import { expect, test } from "vitest";
import { sanitizeEvidence } from "../ci-evidence";

test("CI artifacts retain exact-revision outcomes and omit arbitrary runner content", () => {
  const sha = "1".repeat(40);
  const lifecycle = {
    schemaVersion: 1, slice: "VS-05", runId: "ci-123-1", candidateSha: sha,
    candidateTree: "2".repeat(40), worktreeDirty: false, status: "pass",
    toolVersions: { bun: "1.4.5", unexpected: "private" },
    stages: [{ id: "launch", status: "pass", detail: "private" }],
    observations: { liveApi: { status: "pass", httpStatuses: [200, 201], requestCount: 1, extra: "private" } },
  };
  const attempt = {
    schemaVersion: 1, slice: "VS-05", runId: lifecycle.runId, candidateSha: sha,
    worktreeDirty: false, status: "pass",
    checks: [{ id: "browser", status: "pass", exitCode: 0, artifactPaths: ["private"] }],
  };
  const evidence = sanitizeEvidence(lifecycle, attempt, sha, lifecycle.runId);
  expect(evidence).toMatchObject({
    candidateSha: sha,
    toolVersions: { bun: "1.4.5" },
    stages: [{ id: "launch", status: "pass" }],
    checks: [{ id: "browser", status: "pass", exitCode: 0 }],
    observations: { liveApi: { status: "pass", httpStatuses: [200, 201], requestCount: 1 } },
  });
  expect(JSON.stringify(evidence)).not.toContain("private");
  expect(() => sanitizeEvidence(lifecycle, attempt, "3".repeat(40), lifecycle.runId)).toThrow();
  expect(() => sanitizeEvidence(lifecycle, { ...attempt, worktreeDirty: true }, sha, lifecycle.runId)).toThrow();
});
