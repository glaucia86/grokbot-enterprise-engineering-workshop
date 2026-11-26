# Issue PH-42 — Duplicate purchase requests under concurrent submissions

**Suggested labels:** bug, data-integrity, workshop, priority-high  
**Status:** workshop exercise with a reproducible synthetic snapshot. PH-42 is a logical identifier, not a reserved GitHub issue number.

## Why

A retry of a purchase submission should not create a second purchase request or duplicate the creation audit event. Sequential retries appear to work, but concurrent requests can violate this invariant. The duplication risks parallel approval processes and unreliable financial records.

## Workshop verification

Start the loopback workshop profile and run the readiness check described in the [lab setup](../README.md#run-the-lab). Run these commands separately.

| Command | Input | Expected observation |
| --- | --- | --- |
| `npm run verify:ph42-fixture` | Synthetic historical snapshot read by PostgreSQL in a read-only transaction | Simulated HTTP 201/201, different request IDs, two requests and two CREATED events for one tenant and key. The check exits 1. |
| `npm run verify:concurrency` | Two equivalent submissions through the running API using the synthetic requester | Observed HTTP 200/201, a shared request ID, one request and one CREATED event. The check exits 0. |

Both commands evaluate the same invariant. Record the snapshot output and the API output with their sources when presenting or reviewing evidence.

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

Inspect the synthetic observation → state the invariant → inspect the application and persistence boundary → verify the live contract → collect evidence → submit for independent review. Stop and report a blocker after the configured retry budget; never claim an unexecuted verification passed.

No implementation recipe or instructor ADR belongs in the participant-facing issue.
