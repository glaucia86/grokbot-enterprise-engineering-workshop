# PRD — Procurement Hub Enterprise Financial Approval Integrity

**Document ID:** `PH-PRD-002`  
**Version:** `2.0`  
**Status:** Accepted for Enterprise Workshop Transformation  
**Date:** `2026-11-26`  
**Incident Focus:** `PH-42 — Concurrent Procurement Approval Violates Financial and Tenant Isolation Invariants`

---

## 1. Problem Statement

Procurement Hub is a brownfield, multi-tenant corporate procurement platform where employees submit purchase requests against organizational **Cost Centers** and authorized managers approve or reject them.

In production incident **PH-42**, concurrent approvals against the same **Cost Center** can observe stale **Committed Budget** balances and commit funds that exceed the **Allocated Budget**. For example, when **Cost Center** `CC-ENG-01` has `$10,000.00` available and two pending **Purchase Requests** of `$7,000.00` each are approved concurrently, the defective system approves both, committing `$14,000.00` and driving **Available Budget** to `-$4,000.00`.

Furthermore, network timeouts, client retries, idempotency key misuse, authorization revocations, and partial transaction failures can double-commit funds, duplicate **Audit Events**, or leak cross-tenant financial state unless enforced atomically across domain, authorization, and persistence boundaries.

## 2. Solution Overview

Establish enforceable enterprise invariants across Procurement Hub's Modular Monolith so that:

1. **Cost Center** budgets use exact integer minor units (`MoneyMinor`, USD cents) and never overspend under any concurrent approval schedule.
2. Approval operations support tenant-scoped **Approval Idempotency Keys** with canonical payload fingerprinting, safe replay after lost responses, and strict conflict detection on mismatched payloads or actors.
3. Server-side tenant isolation and **Approval Policy** enforcement (role, non-self-approval, tenant boundary, and per-approver monetary authority limit) execute on **both** initial approval and idempotent replay paths.
4. State transitions, **Financial Commitments**, **Committed Budget** updates, **Approval Idempotency Records**, and durable **Audit Events** succeed or roll back atomically inside a single PostgreSQL transaction.
5. Every claim is independently verifiable through deterministic checks, live runtime verification against real PostgreSQL and Chromium, property-based testing, bounded TLA+ model checking, and revision-bound evidence.

---

## 3. Personas & Seeded Synthetic Organization Model

All data is strictly synthetic and isolated to disposable loopback workshop resources.

| Tenant | Synthetic Identity | Role | Approval Limit | Capabilities |
| --- | --- | --- | --- | --- |
| Northstar Industries | `northstar-requester` | `REQUESTER` | N/A | Submit purchase requests against Northstar cost centers; list/view own requests |
| Northstar Industries | `northstar-requester-alt` | `REQUESTER` | N/A | Secondary Northstar requester (ownership isolation & key-collision testing) |
| Northstar Industries | `northstar-approver` | `APPROVER` | `$25,000.00` (`2,500,000` cents) | List/view Northstar requests & cost centers; approve/reject pending requests by others up to `$25,000.00` |
| Northstar Industries | `northstar-approver-2` | `APPROVER` | `$25,000.00` (`2,500,000` cents) | Second eligible Northstar approver (concurrent multi-approver race scenarios) |
| Northstar Industries | `northstar-junior-approver` | `APPROVER` | `$5,000.00` (`500,000` cents) | Authorized only up to `$5,000.00` (tests organizational policy limit `INV-06`) |
| Northstar Industries | `northstar-auditor` | `AUDITOR` | N/A | Read-only access to Northstar cost centers, requests, commitments, and audit trail |
| Meridian Retail | `meridian-requester` | `REQUESTER` | N/A | Independent tenant requester (`INV-05`) |
| Meridian Retail | `meridian-approver` | `APPROVER` | `$25,000.00` (`2,500,000` cents) | Independent tenant approver (`INV-05`) |
| Meridian Retail | `meridian-auditor` | `AUDITOR` | N/A | Independent tenant auditor (`INV-05`) |

### Seeded Cost Centers

| Tenant | Code | Name | Allocated Budget | Initial Committed | Initial Available |
| --- | --- | --- | --- | --- | --- |
| Northstar Industries | `CC-ENG-01` | Platform Engineering Q4 | `$10,000.00` (`1,000,000` cents) | `$0.00` | `$10,000.00` |
| Northstar Industries | `CC-OPS-01` | Warehouse Operations Q4 | `$25,000.00` (`2,500,000` cents) | `$0.00` | `$25,000.00` |
| Meridian Retail | `CC-MER-01` | Store Systems Q4 | `$10,000.00` (`1,000,000` cents) | `$0.00` | `$10,000.00` |

---

## 4. Business Invariants (`INV-01` – `INV-10`)

| ID | Name | Formal Business Rule |
| --- | --- | --- |
| `INV-01` | Financial consistency | For every **Cost Center**, `committedBudgetMinor <= allocatedBudgetMinor` and `committedBudgetMinor = SUM(financial_commitments.amount_minor)` at all times. |
| `INV-02` | Non-negative availability | For every **Cost Center**, `availableBudgetMinor = allocatedBudgetMinor - committedBudgetMinor >= 0` at all times. |
| `INV-03` | Idempotency | Equivalent retries of an approval (or purchase submission) with the same tenant + idempotency key never create additional **Financial Commitments**, additional budget deductions, or extra business transitions. |
| `INV-04` | Payload consistency | Reusing an idempotency key with a semantically different normalized payload or a different actor in the same tenant returns `409 IDEMPOTENCY_CONFLICT` with zero state mutation and no disclosure of the original record. |
| `INV-05` | Tenant isolation | A **Tenant** can never read, approve, commit against, or audit another **Tenant**'s **Cost Centers**, **Purchase Requests**, **Financial Commitments**, or **Audit Events** (foreign resource IDs return `404 NOT_FOUND`). |
| `INV-06` | Authorization | Only an active same-tenant `APPROVER` who did not create the request and whose `approvalLimitMinor >= request.amountMinor` may approve it. Authorization executes before any idempotent replay is returned. |
| `INV-07` | State machine integrity | **Purchase Requests** transition strictly `PENDING -> APPROVED` or `PENDING -> REJECTED`. Terminal states (`APPROVED`, `REJECTED`) admit no further transitions even under a brand-new idempotency key (`409 INVALID_TRANSITION`). |
| `INV-08` | Audit consistency | Every successful creation produces exactly one `CREATED` **Audit Event**, and every successful decision produces exactly one `APPROVED` or `REJECTED` **Audit Event** — never duplicated by retries and never lost on commit. |
| `INV-09` | Atomicity | Request status update, **Cost Center** committed balance update, **Financial Commitment** insertion, **Approval Idempotency Record** insertion, and **Audit Event** insertion commit or roll back as one atomic unit. |
| `INV-10` | Recoverability | A transaction failure before commit leaves zero partial state and keeps the request `PENDING` and key reusable; a response lost after commit is safely recovered by retrying with the same idempotency key. |

---

## 5. User Stories & Functional Requirements

| ID | Requirement | Related Invariants |
| --- | --- | --- |
| `FR-01` | Manage multi-tenant synthetic identities with role and `approvalLimitMinor`, authenticated via server-side HTTP-only lab sessions. | `INV-05`, `INV-06` |
| `FR-02` | Expose tenant-scoped **Cost Centers** showing allocated, committed, and available budgets in exact USD minor units (`MoneyMinor`). | `INV-01`, `INV-02`, `INV-05` |
| `FR-03` | Allow `REQUESTER` actors to submit idempotent **Purchase Requests** bound to a same-tenant **Cost Center** with positive integer USD minor units. | `INV-03`, `INV-04`, `INV-05`, `INV-08` |
| `FR-04` | Allow eligible same-tenant `APPROVER` actors to approve or reject `PENDING` requests with an explicit `Idempotency-Key`, checking budget sufficiency and authority limits atomically. | `INV-01`, `INV-02`, `INV-06`, `INV-07`, `INV-09` |
| `FR-05` | Record durable **Financial Commitments** (`1:1` with approved requests) and update `cost_centers.committed_budget_minor` atomically on approval. | `INV-01`, `INV-02`, `INV-09` |
| `FR-06` | Support idempotent decision replay (same tenant, key, actor, request, decision, normalized reason) and reject mismatched payload/actor reuse with generic `409 IDEMPOTENCY_CONFLICT`. | `INV-03`, `INV-04`, `INV-06`, `INV-10` |
| `FR-07` | Reject attempts to approve/reject an already terminal request with a different idempotency key (`409 INVALID_TRANSITION`) without altering budget or audit records. | `INV-07`, `INV-08` |
| `FR-08` | Enforce read-only tenant-scoped audit trail (`CREATED`, `APPROVED`, `REJECTED`) accessible to `APPROVER` and `AUDITOR` roles only. | `INV-05`, `INV-06`, `INV-08` |
| `FR-09` | Provide deterministic failure reproduction (`ph42:reproduce`), reusable verification harness (`verify:all`), feature maps, bounded loop engine, and bounded TLA+ model checking (`verify:formal`). | All (`INV-01`–`INV-10`) |
| `FR-10` | Enforce revision-bound machine + human verification evidence, independent multi-job CI gates, and human-approved PR governance. | Governance |

### User Stories

1. As a **Requester**, I want to select my tenant's **Cost Center** and submit a **Purchase Request**, so that my purchase is tracked against the right departmental budget.
2. As an **Approver**, I want to see the **Cost Center**'s allocated, committed, and available budget before deciding a **Purchase Request**, so that I can make informed financial decisions.
3. As a **Finance Controller**, I want concurrent approvals against the same **Cost Center** to never exceed its allocated budget, so that corporate spend stays strictly within authorized limits.
4. As an **Approver** experiencing a network timeout, I want to safely retry my approval with the same **Idempotency Key**, so that the request is not double-committed or audited twice.
5. As a **Security Engineer**, I want idempotency key collisions and cross-tenant requests to fail without leaking resource details, and authorization to be re-checked even on idempotent replays, so that revoked or unauthorized actors cannot bypass controls.
6. As an **Auditor**, I want a complete, non-duplicated **Audit Trail** paired with durable **Financial Commitments**, so that every committed dollar reconciles cleanly to one approved request and one approval event.
7. As a **Platform Reviewer**, I want every PR backed by exact-SHA verification artifacts (unit, integration, concurrency, security, property, E2E, and bounded TLA+ checks), so that I can make an evidence-based merge decision.

---

## 6. Acceptance Criteria & Gherkin Scenarios

| ID | Acceptance Criterion | Invariants | Verification Seam |
| --- | --- | --- | --- |
| `AC-01` | Concurrent approvals of two `$7,000` requests against a `$10,000` cost center approve at most one (`200`) and reject the other (`409 INSUFFICIENT_BUDGET`); committed = `$7,000`, available = `$3,000`, commitments = `1`. | `INV-01`, `INV-02`, `INV-09` | HTTP concurrency + PostgreSQL |
| `AC-02` | Retrying a committed approval with the same `Idempotency-Key` and equivalent payload returns `200` with the approved request, keeping committed budget, commitments, and `APPROVED` audit count unchanged. | `INV-03`, `INV-08`, `INV-10` | HTTP integration + PostgreSQL |
| `AC-03` | Reusing an approval `Idempotency-Key` with a different request ID, decision, normalized reason, or different actor in the same tenant returns generic `409 IDEMPOTENCY_CONFLICT` with zero mutations. | `INV-04` | HTTP integration + PostgreSQL |
| `AC-04` | Submitting a new `Idempotency-Key` to approve an already-`APPROVED` or `REJECTED` request returns `409 INVALID_TRANSITION` with zero budget or audit changes. | `INV-07`, `INV-08` | HTTP integration + PostgreSQL |
| `AC-05` | Unauthorized approval attempts (`REQUESTER`, `AUDITOR`, self-approval, `approvalLimitMinor` exceeded, or revoked authority on idempotent replay) return `403` and leave state unchanged. | `INV-06` | HTTP security tests + PostgreSQL |
| `AC-06` | Cross-tenant read, submit (foreign cost center), approve, or audit returns `404 NOT_FOUND` with zero data disclosure; identical idempotency keys across tenants are independent. | `INV-05` | HTTP security tests + PostgreSQL |
| `AC-07` | A transaction failure before commit (e.g., rejected audit insert) rolls back request status, committed budget, financial commitment, and idempotency key completely; subsequent retry succeeds. | `INV-09`, `INV-10` | PostgreSQL rollback integration |
| `AC-08` | Purchase request submission preserves tenant-scoped idempotency, positive integer minor units, strict input validation (`400`), and exact single `CREATED` audit event. | `INV-03`, `INV-04`, `INV-08` | Unit + Integration + Properties |
| `AC-09` | Browser E2E workflow covers request creation with cost center, live budget visibility, approval updating committed/available budget, insufficient-budget error handling, audit trail inspection, and cross-tenant 404. | `INV-01`, `INV-02`, `INV-05`, `INV-08` | Playwright Chromium E2E |
| `AC-10` | Enforceable ESLint architectural boundaries reject forbidden imports in `domain`, `application`, `infrastructure`, and UI layers. | Architecture | ESLint + Architecture unit suite |
| `AC-11` | Bounded TLA+ model reproduces `BudgetNotExceeded` counterexample on defective config (`exit 12`) and exhaustively verifies all invariants on locked-atomic config (`exit 0`). | `INV-01`, `INV-02`, `INV-03`, `INV-08`, `INV-09` | TLC model checker |
| `AC-12` | Verification harness produces clean-SHA `manifest.json` + `summary.md` surviving resource cleanup; CI runs independent gates without agent self-merge. | Governance | Harness + CI |

```gherkin
Feature: Concurrent Procurement Approval Financial & Tenant Integrity (PH-42)

  @AC-01 @INV-01 @INV-02 @INV-09
  Scenario: Concurrent approvals cannot exceed cost center budget
    Given Northstar cost center "CC-ENG-01" has allocated budget 1000000 cents and committed budget 0 cents
    And pending purchase request A for 700000 cents against "CC-ENG-01"
    And pending purchase request B for 700000 cents against "CC-ENG-01"
    When two authorized Northstar approvers concurrently approve request A and request B with distinct idempotency keys
    Then exactly one response returns HTTP 200 with status "APPROVED"
    And the other response returns HTTP 409 with error code "INSUFFICIENT_BUDGET"
    And PostgreSQL records committed_budget_minor = 700000 and available budget = 300000 for "CC-ENG-01"
    And PostgreSQL holds exactly 1 financial commitment totaling 700000 cents
    And PostgreSQL holds exactly 1 APPROVED audit event for the winning request and 0 for the losing request

  @AC-02 @INV-03 @INV-08 @INV-10
  Scenario: Approval retry after lost response replays without double commitment or duplicate audit
    Given pending purchase request A for 700000 cents against "CC-ENG-01"
    When "northstar-approver" approves request A with idempotency key "appr-retry-001"
    And "northstar-approver" retries the exact same approval with idempotency key "appr-retry-001"
    Then both responses return HTTP 200 with request A in status "APPROVED"
    And "CC-ENG-01" committed_budget_minor remains 700000 cents
    And PostgreSQL holds exactly 1 financial commitment and 1 APPROVED audit event for request A

  @AC-03 @INV-04
  Scenario Outline: Reusing an approval idempotency key with different payload or actor yields conflict
    Given "northstar-approver" approved request A with idempotency key "appr-key-shared"
    When <actor> calls the decision endpoint for <target> with <payload> and idempotency key "appr-key-shared"
    Then the API returns HTTP 409 with error code "IDEMPOTENCY_CONFLICT" and no details of request A
    And committed_budget_minor, financial_commitments, and audit_events are unchanged
    Examples:
      | actor                | target    | payload                                      |
      | northstar-approver   | request B | {"decision":"APPROVE"}                       |
      | northstar-approver   | request A | {"decision":"REJECT","reason":"Changed mind"}|
      | northstar-approver   | request A | {"decision":"APPROVE","reason":"New note"}   |
      | northstar-approver-2 | request A | {"decision":"APPROVE"}                       |

  @AC-04 @INV-07 @INV-08
  Scenario: Different idempotency key targeting an already approved request is rejected
    Given request A has already been approved with idempotency key "appr-key-1"
    When "northstar-approver-2" attempts to approve request A with a different idempotency key "appr-key-2"
    Then the API returns HTTP 409 with error code "INVALID_TRANSITION"
    And committed_budget_minor and audit_events are unchanged

  @AC-05 @INV-06
  Scenario Outline: Unauthorized actors cannot approve requests or replay approvals after revocation
    Given pending purchase request A for 700000 cents created by "northstar-requester"
    When <actor> attempts to approve request A
    Then the API returns HTTP 403 with error code "<error_code>"
    And request A remains "PENDING" with zero financial commitment
    Examples:
      | actor                     | error_code              |
      | northstar-requester       | FORBIDDEN               |
      | northstar-auditor         | FORBIDDEN               |
      | northstar-junior-approver | APPROVAL_LIMIT_EXCEEDED |

  @AC-05 @INV-06
  Scenario: Authorization is enforced on idempotent approval replay
    Given a temporary Northstar approver approved request A with key "appr-revoke-001"
    And that actor's membership role is subsequently downgraded to "AUDITOR"
    When that actor replays the approval request with key "appr-revoke-001"
    Then the API returns HTTP 403 with error code "FORBIDDEN"

  @AC-06 @INV-05
  Scenario: Cross-tenant isolation protects purchase requests, cost centers, and audit trails
    Given Northstar request A exists under Northstar cost center "CC-ENG-01"
    When "meridian-approver" attempts to read, approve, or view audit for Northstar request A
    Then every endpoint returns HTTP 404 with error code "NOT_FOUND"
    And "meridian-requester" cannot submit a request referencing Northstar cost center "CC-ENG-01"

  @AC-07 @INV-09 @INV-10
  Scenario: Transaction failure before commit leaves no partial commitment or stale key
    Given a disposable database constraint that forces the APPROVED audit insert to fail
    When "northstar-approver" approves pending request A with key "appr-rollback-001"
    Then the API returns HTTP 500 with error code "INTERNAL_ERROR"
    And request A remains "PENDING"
    And "CC-ENG-01" committed_budget_minor remains 0
    And zero financial commitments and zero decision idempotency records persist
    When the fault is removed and "northstar-approver" retries with key "appr-rollback-001"
    Then the approval succeeds with HTTP 200 and commits 700000 cents cleanly
```

---

## 7. Testing Seams (per `to-prd` Skill)

1. **Domain seam (`src/modules/procurement/domain/`)**: pure TypeScript unit & `fast-check` property tests verifying `MoneyMinor`, budget math, `ApprovalPolicy`, and state transitions without database or framework dependencies.
2. **HTTP + PostgreSQL seam (`tests/integration/`, `tests/concurrency/`, `tests/security/`)**: exercises public Next.js API routes against real PostgreSQL 18 using independent connections and server-resolved sessions, verifying HTTP responses alongside committed relational state.
3. **Browser seam (`tests/e2e/`)**: Playwright Chromium exercises real UI journeys end-to-end across requester, approver, and auditor sessions.
4. **Architecture seam (`tests/unit/architecture.test.ts` + `verify:architecture`)**: invokes ESLint directly against negative boundary fixtures.
5. **Formal seam (`formal/ProcurementApproval.tla`)**: TLC exhaustively explores finite interleavings and retries against safety invariants.

---

## 8. Out of Scope

Production SSO/OIDC, multi-currency FX conversion, budget amendment workflows, partial invoice liquidation, ERP webhooks, microservices, Kafka, Kubernetes, PostgreSQL Row-Level Security (RLS), and full mechanized proof of the TypeScript runtime.
