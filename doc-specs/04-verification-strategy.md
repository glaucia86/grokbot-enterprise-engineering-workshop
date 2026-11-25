# Verification strategy and evidence contracts

**ID:** PH-VER-001 | **Version:** 0.1 | **Status:** proposed, not executed

## 1. Design principle

Use Lauren Tan's pstack as a conceptual reference: check the real artifact, test observable behavior, identify root causes, deliver in verifiable units, and encode repeatable rules in executable tooling. The trust strategy prioritizes codebase structure and deterministic enforcement before prose. This is an adaptation, not a native pstack installation or an official GrokBot integration.

## 2. Required checks

| ID | Check | Criteria | Evidence |
| --- | --- | --- | --- |
| V-01 | Typecheck, lint, module-boundary checks | AC-09 | Logs and exit status |
| V-02 | Domain/unit tests: validation, transition, normalization | AC-06/08 | Test report |
| V-03 | Integration with real PostgreSQL: replay, conflicting key, auth/tenant, rollback, competing decisions | AC-02/03/04/05/06/08 | Test report and targeted persisted state |
| V-04 | Real HTTP concurrency driver, two independent connections; assert statuses, same ID and one request/event after requests finish | AC-01/05 | Sanitized HTTP transcript, database snapshot/counts and machine-readable result |
| V-05 | Real browser journey through form, approval and read-only audit | AC-07 | Playwright trace/report and relevant screenshots |
| V-06 | Independent CI reruns V-01–05 against candidate SHA | AC-09 | CI run URL, commit and retained logs |
| V-07 (P1) | Property-based tests over normalized inputs and operation sequences | Selected invariants | Seed, cases and counterexamples |
| V-08 (P1) | TLC on explicitly bounded model; compare defective vs corrected model | Model-level uniqueness | Model/config hashes, tool version, bounds, counterexample or explored-state result |

The runtime driver calls real public application interfaces; direct read-only database inspection supplements observable output to establish persistence. Screenshots alone, mocked persistence, build success or agent claims do not establish data integrity. A TLA+ model is not a proof of the production implementation, and passing generated examples are not formal verification.

## 3. Baseline reproducibility strategy

Concurrency needs a dependable red-to-green demonstration, not a probabilistic race that may fail to appear during the session. Use two independent layers:

1. Deterministic integration regression: coordinate two calls at the persistence boundary after both have observed no existing row. The test can inject a synchronization decorator around the repository's read method; it must use the real database and must not change production semantics or rely on sleeps. The reference path may no longer use a pre-read; design the final regression to exercise it too without waiting for a hook it never reaches. Use bounded barrier timeouts and explicit cleanup.
2. Runtime proof: send concurrent requests to the real HTTP API using fresh synthetic data/keys in a disposable database. If ordinary scheduling does not reproduce the defect, a bounded lab-only PostgreSQL test fixture (e.g., a temporary insert delay trigger) may widen the race window; document, isolate, remove and disclose that fixture, verify the real application path, and also run the fixed code against the ordinary environment. No hidden public test endpoint or mutation of production data. The actual mechanism must be selected and proven in the implementation spike.

A starter check that unexpectedly passes is a reproducibility failure, not a reason to fake a screenshot. Record the known failing invariant separately from ordinary baseline checks. The starter branch can intentionally exhibit a red lab-specific check; the solution/delivery branch must require the real invariant checks to pass. Do not convert intentional failure into a success result for the candidate fix.

## 4. Verification skill contract

Suggested location: `skills/verify-procurement/SKILL.md`; adapt registration to GrokBot only after a capability spike. Inspired by the original [create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md).

| Section | Required contents |
| --- | --- |
| Launch | Exact commands, container/port/session ownership, migrations and seed, readiness and setup timeout |
| Doctor | Read-only checks for correct commit/build, expected database, ready app, valid lab session, isolated environment |
| Drive | Stable browser locators, public API routes, actual verification commands, preconditions |
| Evidence | Capture commands, expected vs observed state, exit codes, sanitized results; verify persistence; no claims from proxies |
| Cleanup | Stop only owned processes/containers; drop only disposable lab data when requested; preserve evidence |
| Helpers | Versioned executable scripts with documented invocation and explicit timeouts |

Feature map seed:

- `features/README.md`: index and coverage matrix.
- `purchase-requests.md`: create/list/view; normal path and replay/concurrency journeys.
- `approval-workflow.md`: separate actor, valid pending-state transition, denied attempts.
- `tenant-isolation-and-audit.md`: tenant-specific visibility, audit scope, creation-event count and read-only behavior.

Each feature describes observable behavior, user entry path, exact drive instructions and known prerequisites/gotchas. Verify the skill itself through launch → doctor → drive → capture → cleanup, and confirm evidence survives cleanup. Maintain feature maps as the app changes.

## 5. Proposed command interface

These are names to implement, not commands that already work:

```bash
npm ci
npm run lab:up
npm run lab:doctor
npm run dev
npm run check:static
npm run test:unit
npm run test:integration
npm run verify:concurrency
npm run test:e2e
npm run verify:all
npm run lab:down
```

`lab:up` provisions only the disposable DB, migrates and seeds it; `dev` runs the app. `lab:doctor` has a documented DB-only readiness mode and an app-ready mode; all runtime checks require the latter. The implementation must document startup order (start app in a second terminal after DB setup, then app-ready doctor) and exact shell-compatible arguments. `verify:all` orchestrates required checks and fails closed if any required check fails or is skipped. `lab:down` stops owned lab resources without deleting evidence; destructive reset requires explicit opt-in and disposable DB identification. Each test run uses unique keys/isolated seed state. Exact flags and versions are deferred to implementation.

## 6. Evidence manifest contract

For every verification run, retain a machine-readable manifest and human summary:

```json
{
  "schemaVersion": 1,
  "runId": "example-only",
  "candidateSha": "<actual commit SHA>",
  "worktreeDirty": false,
  "environment": "isolated-lab",
  "checks": [
    {
      "id": "V-04",
      "criteria": ["AC-01", "AC-05"],
      "status": "not-run",
      "command": "npm run verify:concurrency",
      "exitCode": null,
      "artifactPaths": [],
      "limitations": ["Illustrative manifest; no execution"]
    }
  ]
}
```

Allowed statuses: `pass`, `fail`, `blocked`, `not-run`; an absent or skipped required check is not a pass. Include tool versions, start/end timestamps and run duration, environment identity, inputs (sanitized), exit status and expected vs observed outputs. CI artifacts must be retained per run, not overwritten by later retries. For local exploratory dirty-worktree evidence, disclose the diff/hash and rerun on a clean candidate commit for final acceptance. No cookies, credentials, personal data or misleading fabricated results in artifacts.

## 7. Governance and stopping conditions

- Agent proposes changes on an isolated branch; two correction attempts after initial execution are the proposed live budget, subject to timeouts and rehearsal. Escalate persistent failures; do not expand scope silently.
- Require independent CI on the exact candidate revision and review by an authorized human. Use protected delivery branches/rulesets and require review of changes to policy, workflows and verification. A local starter fork may not have these controls; document the difference rather than claiming enforcement.
- Keep default agent credentials least-privileged and test-only. If GrokBot cannot enforce a boundary, place it outside the agent (repo permissions, CI, isolated environment) or mark it unsupported.
- PR summary must map criteria to evidence, disclose failed or unrun checks, note assumptions and migration risks, and identify the exact commit. Merge remains a human decision.

## 8. Formal extension boundary

The optional prepared TLA+ exercise models two actors submitting a key, tenant scope, and commit semantics. Specify initial states, transitions, finite domains and a uniqueness invariant. Show a counterexample for the faulty model and a checked corrected model over its configured bounds. It is a separate teaching artifact; it must not be described as proving actual database code or exhaustive production behavior. Omit from live session if main runtime proof or Q&A needs the time.
