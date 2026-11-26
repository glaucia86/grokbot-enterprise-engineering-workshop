# Verification strategy and evidence contracts

**ID:** PH-VER-001 | **Version:** 0.2 | **Status:** local harness implemented in VS-04

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

PH-42 uses two evidence sources. Each goes through the same driver-level invariant evaluator.

1. **Repeatable red observation.** `bun run verify:ph42-fixture` evaluates synthetic historical responses and reads the associated records with a PostgreSQL read-only query. It exits 1 and identifies its source as `synthetic-snapshot`. The fixture contract checks tenant and creation-event scope.
2. **Live runtime proof.** `bun run verify:concurrency` sends an equivalent request on each of two HTTP connections and reads persisted counts from the disposable lab. It exits 0 when the responses identify one committed request and the database contains one creation event.

The fixture contract passes by asserting the expected fixture failure and its scoped counts. The live runtime check passes when the actual API and database satisfy the invariant. Preserve the output from each command and identify its evidence source in the handoff.

## 4. Verification skill contract

The [operator guide](../skills/verify-procurement/SKILL.md) and [feature map](../skills/verify-procurement/features/README.md) define the reusable procedure. Native GrokBot registration calls for a capability spike. The procedure draws on [create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md).

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

## 5. Command interface

```bash
bun install --frozen-lockfile
bun run browser:install
bun run verify:all --run-id workshop-rehearsal
```

The one-shot command runs launch, doctor, drive, evidence and cleanup. It keeps the lifecycle and the individual check results under `artifacts/verification/VS-04/workshop-rehearsal/`. The overall result requires a clean revision, successful required checks and successful teardown. Use a new run ID for each complete run.

To work through the checks manually, copy `.env.example` to `.env` and start the database:

```bash
bun run lab:up
bun run lab:doctor --db-only
```

In a second terminal, start the application:

```bash
bun run dev
```

From the first terminal, check app readiness and run your selected scenarios:

```bash
bun run lab:doctor
bun run check:static
bun run test:unit
bun run test:integration
bun run verify:concurrency
bun run test:e2e
```

Run `bun run verify:ph42-fixture` on its own to observe the expected exit 1. Stop the manually started app with Ctrl+C and run `bun run lab:down` to stop the database while retaining its volume.

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
      "command": "bun run verify:concurrency",
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

The [optional PH-42 exercise](../formal/README.md) provides TypeScript property tests and a TLA+ model that compares stale reads with an atomic commit. The model covers two clients, two tenants and two keys. Keep the model's trace and state counts separate from the implementation evidence. Omit this extension from the live session if the runtime walkthrough or Q&A needs the time.
