# Issue PH-42 — Duplicate purchase requests under concurrent submissions

**Suggested labels:** bug, data-integrity, workshop, priority-high  
**Status:** draft for starter branch; GitHub issue not created. PH-42 is a logical identifier, not a reserved GitHub issue number.

## Why

A retry of a purchase submission should not create a second purchase request or duplicate the creation audit event. Sequential retries appear to work, but concurrent requests can violate this invariant. The duplication risks parallel approval processes and unreliable financial records.

## Reproduction

Use the repository's disposable lab environment and synthetic requester session. Start the application and verify readiness with the doctor script. Submit two equivalent requests concurrently with the same `Idempotency-Key` and compare the returned identifiers and persisted state. The proposed command is `npm run verify:concurrency`; actual command and reproducibility must be validated when building the starter. A healthy baseline has the same ordinary UI and approval flow as the solution.

**Expected:** one request and one CREATED audit event for the logical operation. Both successful responses refer to the same resource (one create, one replay).

**Observed in the designed starter defect:** overlapping attempts may create two records and two creation events. This is the intended fault to be implemented and verified, not evidence from an already executed application.

## Acceptance criteria

- [ ] AC-01: concurrent equivalent submissions by the same requester and tenant create exactly one persisted request and return the same ID.
- [ ] AC-02: equivalent sequential retries do not duplicate records.
- [ ] AC-03: same tenant/key with different normalized content or requester returns a generic 409 and does not mutate state or disclose other request details.
- [ ] AC-04: the same key is independent across tenants; foreign resource access is denied without revealing existence.
- [ ] AC-05: one creation audit event per logical creation; failed transactions leave neither request nor event.
- [ ] AC-06/07/08: approval authorization, transition rules, ordinary submission journey and validation still pass.
- [ ] AC-09: submit a scoped pull request with candidate revision, actual check results, evidence paths, limitations and any unverified criteria.

## Constraints

Keep the API contract and tenant/role boundaries intact. Correct the root cause rather than adding a timing delay, swallowing an error, globally locking the process, or weakening tests. Account for multiple app instances using the same database. Avoid unrelated refactors. Do not alter acceptance criteria or CI protections to obtain a green result. If a legitimate test defect is identified, document it and propose a separately reviewed change.

## Suggested workflow

Reproduce → identify root cause → establish failing regression test → implement smallest robust change → rerun checks → collect evidence → submit PR for independent review. Stop and report a blocker after the configured retry budget; never claim an unexecuted verification passed.

No implementation recipe or instructor ADR belongs in the participant-facing issue.
