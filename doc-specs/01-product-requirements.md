# PRD — Procurement Hub

**ID:** PH-PRD-001 | **Version:** 0.1 | **Status:** proposed | **Date:** 2026-11-25

## 1. Problem and learning objective

Enterprise teams need repeatable agentic engineering workflows that preserve business invariants, integrate with existing CI, and provide evidence instead of relying on agent self-reports. Procurement Hub simulates a brownfield system in which one concurrency defect can create multiple purchase requests and audit events.

The workshop succeeds if attendees can start from the same faulty application, reproduce a genuine violation, understand the verification harness, and independently run the checks against a reference fix. Do not represent the exercise as a production-ready procurement system.

## 2. Users and scope

| Persona | Permissions in the lab |
| --- | --- |
| Requester | Create, list and view own purchase requests in their active tenant |
| Approver | List and view requests in their active tenant; approve or reject pending requests created by another person |
| Auditor | Read requests and audit history within their active tenant; no writes |
| Engineering agent | Work in the lab repository and isolated test environment; propose changes and evidence, never approve or merge its own work |

Use two fictional tenants, Northstar Industries and Meridian Retail, with deterministic seeded users. All identities and data are synthetic. The active tenant and actor must come from a validated server-side session and membership, not from a request body, query parameter, or an arbitrary client header. A clearly marked development-only identity selector is acceptable for the demo, with an explicit startup guard against use outside the lab profile. It is not production authentication.

### In scope (P0)

| ID | Requirement |
| --- | --- |
| FR-01 | Seed two tenants with requester, approver and auditor identities; establish a server-side lab session |
| FR-02 | A requester submits a purchase request: title, justification, amount in integer minor units, fixed currency USD for this lab, and idempotency key |
| FR-03 | List and inspect requests according to role and tenant scope |
| FR-04 | An approver may approve or reject a pending request made by another actor; terminal states cannot be changed by this workflow |
| FR-05 | Record creation and approval/rejection events atomically with each successful state transition |
| FR-06 | Reject invalid input, unauthenticated or unauthorized actions and cross-tenant access without leaking unrelated resources |
| FR-07 | Resolve equivalent repeated submissions to the same request; only the creation path creates a creation audit event |
| FR-08 | Reuse of a key with a different normalized payload or a different requester in the same tenant yields a generic conflict, without disclosing the other request |
| FR-09 | The same key in another tenant is independent |
| FR-10 | Provide an isolated, reproducible lab environment and documented verification commands |

### P1 / optional

- A small property-based test suite for invariants, with seed and counterexample reporting.
- A prepared bounded TLA+ model of the concurrent-submission defect and reference design.
- An optional browser trace attachment and a portable adoption guide for enterprise teams.

### Out of scope

Real purchases, payment, ERP integration, supplier management, email notifications, external identity providers, multi-currency conversion, distributed services, Kubernetes, production deployment, compliance certification, database row-level security (RLS), full audit immutability, and formal proofs of the TypeScript implementation. These are extension topics, not claims of lab coverage.

## 3. Business workflow

1. Requester opens the new request form and submits a valid request. A key identifies one logical submission intent, not one network attempt. The UI retains it across retries of unchanged input and creates a new key for a new intent.
2. A successful submission creates a PENDING request and one CREATED audit event. An equivalent replay returns the same request ID and does not repeat the event.
3. An approver in the same tenant views the pending request and approves or rejects it, with a reason for rejection. The state transition and corresponding audit event are atomic.
4. The requester views the current status; an auditor can view the tenant's audit history without mutation privileges.

State transitions: `PENDING -> APPROVED` or `PENDING -> REJECTED`. Neither terminal state has an outgoing transition in this lab. Creating a request starts directly at PENDING; no draft workflow.

## 4. Invariants and acceptance criteria

| ID | Invariant / criterion | Minimum evidence |
| --- | --- | --- |
| AC-01 | Concurrent equivalent submissions by the same requester with the same tenant/key produce exactly one persisted request; both successful responses identify it | Two real HTTP requests; IDs, statuses and PostgreSQL count |
| AC-02 | Sequential equivalent retries also return the original ID and do not create extra rows | HTTP response and persisted count |
| AC-03 | Same tenant/key and different payload or requester returns 409; no unauthorized resource details or extra writes | HTTP response, state and audit count |
| AC-04 | Distinct tenants can use the same key; access to a known foreign request ID yields 404 | Two seeded tenant sessions and persisted tenant-scoped counts |
| AC-05 | Exactly one CREATED audit event exists per successful logical creation; if transaction fails, neither request nor audit event persists | Database query and rollback integration case |
| AC-06 | Approvals/rejections remain role-scoped, same-tenant and valid-state only; self-approval is rejected; one terminal decision event at most | Integration tests, including competing decisions |
| AC-07 | The normal user journey remains functional | Browser journey: submit, approve, inspect status/audit |
| AC-08 | Invalid requests produce appropriate non-success status and no mutations | Validation and authorization tests |
| AC-09 | Changes respect architecture and pass required independent gates; evidence is tied to exact candidate revision | Lint, types, tests, CI run, PR evidence manifest |

AC-01 and its duplicate audit consequence are intentionally broken in the starter. Other applicable baseline criteria must be verified before release. The solution must satisfy all P0 criteria. P1 formal-model claims require separate evidence.

## 5. Non-functional requirements

- Reproducibility: clean checkout, lockfile, documented runtime versions, isolated local database, deterministic seeds, a documented reset with destructive operations limited to disposable lab data.
- Safety: no production credentials, personal data, external transactions or deployment permissions; no secrets in repository or evidence.
- Integrity: database-backed enforcement for the uniqueness invariant in the reference implementation; no reliance on an in-process mutex.
- Reviewability: small scoped commits, immutable evidence associated with the candidate commit, explicit failure/blocker reporting.
- Accessibility: labeled controls, keyboard-operable forms, visible feedback and readable status indicators. This is not an accessibility certification.
- Performance: no latency SLA; timings gathered in rehearsals describe the lab environment only.

## 6. Product boundary for the live hour

The approval flow is prebuilt and acts as a regression surface. The only substantive live product change is the idempotency/concurrency fix. The main demonstration covers AC-01, AC-03, AC-04 and AC-05 through prepared commands and shows existing regression results. The full suite and optional extensions remain available to attendees after the session.
