# PRD — Procurement Hub

**ID:** PH-PRD-001 | **Version:** 0.2 | **Status:** proposed | **Date:** 2026-11-25

## 1. Problem and learning objective

Enterprise teams need repeatable agentic engineering workflows that preserve business invariants, integrate with existing CI, and provide evidence instead of relying on agent self-reports. Procurement Hub simulates a brownfield system in which one concurrency defect can create multiple purchase requests and audit events.

The workshop succeeds if attendees can inspect the same failing observation, explain the violated invariant, and independently run the checks against the live authoring lab. Do not represent the exercise as a production-ready procurement system.

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

### User stories

| Story | User outcome | Requirements |
| --- | --- | --- |
| US-01 | As a participant, I can switch among seeded lab identities so I can exercise each role and tenant from a clean environment. | FR-01 |
| US-02 | As a requester, I can submit a purchase intent and find it in my own history. | FR-02, FR-03 |
| US-03 | As a requester, I can retry an unchanged intent and recover its ID and current status. | FR-07 |
| US-04 | As a requester, I can recognize when a key is already bound to another intent so I can start a new submission. | FR-08 |
| US-05 | As an approver, I can review pending requests in my tenant and record a single decision on another actor's request. | FR-03, FR-04, FR-05 |
| US-06 | As an auditor, I can trace actions within my tenant without gaining mutation privileges. | FR-03, FR-05, FR-06 |
| US-07 | As a tenant member, I can use the lab without learning the existence or details of requests outside my authority. | FR-06, FR-08, FR-09 |
| US-08 | As a reviewer, I can reproduce the observed outcome and inspect independently generated candidate evidence. | FR-10 |

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

The PH-42 snapshot represents a failing AC-01 observation and its duplicate audit consequence. Verify all applicable runtime criteria before release. The solution must satisfy all P0 criteria. P1 formal-model claims require separate evidence.

### Acceptance scenarios

```gherkin
Feature: Tenant-scoped procurement integrity

  @AC-01 @AC-05
  Scenario: Concurrent retries represent a single purchase intent
    Given a requester in Northstar Industries and an unused key in that tenant
    When two independent HTTP clients submit equivalent requests concurrently as that requester with that key
    Then the responses are one 201 and one 200 and both contain the same request ID
    And PostgreSQL holds one purchase request and one CREATED event for the submission

  @AC-02
  Scenario: An equivalent retry returns the current representation
    Given a requester already created a request and an approver decided it
    When the requester submits the equivalent normalized payload with the original key
    Then the API returns 200 with the original ID and current decision status
    And the stored request and event counts stay the same

  @AC-03
  Scenario Outline: A key collision discloses no unrelated request
    Given a request already exists for a key in Northstar Industries
    When <actor> submits <payload> with that key in Northstar Industries
    Then the API returns 409 IDEMPOTENCY_CONFLICT with no request or actor details
    And the stored request and event counts stay the same
    Examples:
      | actor                     | payload               |
      | the original requester    | a changed amount      |
      | another eligible requester| an equivalent payload |

  @AC-04
  Scenario: Tenant is part of the key and resource boundaries
    Given a requester in Northstar Industries has submitted a request with a key
    When a Meridian Retail requester submits a request with the same key
    Then the API returns 201 with a different request ID
    When the Meridian Retail requester reads the Northstar Industries request by ID
    Then the API returns 404 and its response contains no foreign request details

  @AC-05
  Scenario: Failure to record creation rolls back the whole submission
    Given a disposable database fixture that rejects the creation event write
    When a requester submits a valid new purchase request
    Then the submission fails
    And neither the request nor the event persists

  @AC-06
  Scenario: Competing decisions can persist only one terminal result
    Given two eligible approvers and a pending request in their tenant
    When they attempt opposite decisions concurrently
    Then one succeeds and the other receives 409 INVALID_TRANSITION
    And the single terminal audit event matches the stored request status

  @AC-06 @AC-08
  Scenario Outline: The decision boundary denies disallowed actions
    Given an existing request
    When <actor> attempts <decision>
    Then the API returns <status> and no request or audit event changes
    Examples:
      | actor                              | decision                     | status |
      | an approver who created the request| a valid approval             | 403    |
      | an auditor in the tenant           | a valid approval             | 403    |
      | an approver in another tenant      | a valid approval             | 404    |
      | an eligible approver               | a rejection without a reason | 400    |

  @AC-07
  Scenario: The purchase workflow works in a browser
    Given seeded requester, approver and auditor sessions in one tenant
    When the requester submits a valid form and the approver approves the request
    Then the requester sees APPROVED and the auditor sees CREATED and APPROVED

  @AC-08
  Scenario Outline: Invalid creation is rejected
    Given a new purchase submission
    When <attempt> is made
    Then the API returns <status> and persists no request or audit event
    Examples:
      | attempt                              | status |
      | an unauthenticated submission        | 401    |
      | a submission by an auditor           | 403    |
      | a submission with a nonpositive amount | 400 |
      | a submission with a malformed key    | 400    |

  @AC-09
  Scenario: Evidence identifies the candidate independently of the agent
    Given a candidate revision proposed for delivery
    When independent CI runs the required checks
    Then reviewers can trace each required check to its outcome and the candidate revision
```

## 5. Non-functional requirements

- Reproducibility: clean checkout, lockfile, documented runtime versions, isolated local database, deterministic seeds, a documented reset with destructive operations limited to disposable lab data.
- Safety: no production credentials, personal data, external transactions or deployment permissions; no secrets in repository or evidence.
- Integrity: database-backed enforcement for the uniqueness invariant in the reference implementation; no reliance on an in-process mutex.
- Reviewability: small scoped commits, immutable evidence associated with the candidate commit, explicit failure/blocker reporting.
- Accessibility: labeled controls, keyboard-operable forms, visible feedback and readable status indicators. This is not an accessibility certification.
- Performance: no latency SLA; timings gathered in rehearsals describe the lab environment only.

## 6. Product boundary for the live hour

The approval flow is prebuilt and acts as a regression surface. The only substantive live product change is the idempotency/concurrency fix. The main demonstration covers AC-01, AC-03, AC-04 and AC-05 through prepared commands and shows existing regression results. The full suite and optional extensions remain available to attendees after the session.

## 7. Risks, metrics and definition of done

| Risk | Signal and response |
| --- | --- |
| The demonstration misses the timing window | Run the starter check across rehearsal attempts and record observed repeatability. Use the documented, time-bounded fixture only if the ordinary scheduling path is insufficient. |
| A successful response hides a duplicate write | Count both requests and creation events after both responses complete. The solution target is one request and one event per logical intent. |
| The lab identity boundary obscures a permissions failure | Use real sessions representing multiple roles and tenants. Each denial scenario must return its documented status and leave persisted state unchanged. |
| Agent integration or evidence upload is unavailable live | Record observed tool capabilities and retain a candidate-linked rehearsal run with independent terminal commands. |

P0 is complete when AC-01 through AC-09 pass on the solution, the starter exhibits the documented red check with ordinary behavior verified, and a human can review the reproducible lab and its evidence. Capture pass counts, rehearsal duration and affected criteria. The release gates and division of work are defined in [vertical slices](05-vertical-slices.md) and [tickets](TICKETS.md).
