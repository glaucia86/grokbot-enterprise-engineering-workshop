# Issue PH-42 — Concurrent Procurement Approval Violates Financial and Tenant Isolation Invariants

**Labels:** `bug`, `incident`, `financial-integrity`, `concurrency`, `security`, `priority-critical`  
**Status:** Open (reproducible in isolated lab)  
**Affected Module:** Procurement Hub — Approval Workflow & Cost Center Budgets

---

## Business Context

Procurement Hub enables authorized managers to approve employee purchase requests against departmental **Cost Center** budgets.

Finance operations reported a critical budget overrun incident: when multiple purchase requests targeting the same **Cost Center** are approved concurrently, the platform allows total **Financial Commitments** to exceed the **Allocated Budget**, driving **Available Budget** negative.

Additionally, incident triage identified related resilience and security risks around approval retries after timeouts, idempotency key reuse, authorization enforcement on replays, cross-tenant boundaries, and partial transaction failures.

---

## Observed Failure Scenario (Reproducible Live)

1. Northstar Industries **Cost Center** `CC-ENG-01` (*Platform Engineering Q4*) has an **Allocated Budget** of `$10,000.00` (`1,000,000` cents) and **Committed Budget** of `$0.00`.
2. Two `PENDING` **Purchase Requests** target `CC-ENG-01`:
   - **Request A:** `$7,000.00` (`700,000` cents)
   - **Request B:** `$7,000.00` (`700,000` cents)
3. Two authorized Northstar approvers approve Request A and Request B concurrently.
4. **Actual defective behavior:** Both approvals return HTTP `200` (`APPROVED`), producing `$14,000.00` (`1,400,000` cents) in financial commitments against a `$10,000.00` budget (`-$4,000.00` available).
5. **Expected behavior:** Exactly one approval succeeds (`200 APPROVED`, `$7,000.00` committed, `$3,000.00` available, 1 commitment, 1 `APPROVED` audit event) and the competing approval fails cleanly (`409 INSUFFICIENT_BUDGET`, request remains `PENDING`, 0 commitment, no `APPROVED` audit event).

### Reproduce Locally

Start the local lab (see `README.md` or `skills/verify-procurement/SKILL.md`), then run:

```bash
bun run ph42:reproduce
```

Inspect the JSON output and before/after PostgreSQL budget snapshot. On the defective baseline, the command exits **`1`** and prints the exact overspent balance.

---

## Required Business Invariants & Acceptance Criteria

- [ ] **INV-01 / INV-02 (Concurrent Budget Safety):** Concurrent approvals against the same Cost Center must never cause `committedBudgetMinor > allocatedBudgetMinor` or negative `availableBudgetMinor`. Competing approvals that exceed remaining budget return `409 INSUFFICIENT_BUDGET` without mutating state.
- [ ] **INV-03 (Idempotent Retries):** Retrying a committed approval with the same `Idempotency-Key` and equivalent payload (e.g., after a lost response/timeout) returns `200` with the approved outcome and creates zero additional commitments, budget deductions, or audit events.
- [ ] **INV-04 (Payload Consistency):** Reusing an approval `Idempotency-Key` with a different target request, decision, normalized reason, or different actor in the same tenant returns generic `409 IDEMPOTENCY_CONFLICT` without disclosing details of the original record or mutating state.
- [ ] **INV-05 (Tenant Isolation):** Cross-tenant reads, submissions referencing foreign Cost Centers, approvals, or audit queries return `404 NOT_FOUND` with zero data leakage. Identical idempotency keys across different tenants remain completely independent.
- [ ] **INV-06 (Authorization — Including Replay):** Only an active same-tenant `APPROVER` who did not submit the request and whose `approvalLimitMinor >= request.amountMinor` can approve (`403 FORBIDDEN` or `403 APPROVAL_LIMIT_EXCEEDED` otherwise). Authorization is enforced even on idempotent replay paths.
- [ ] **INV-07 (State Machine Integrity):** A `PENDING` request transitions at most once (`APPROVED` or `REJECTED`). Submitting a different idempotency key for an already-terminal request returns `409 INVALID_TRANSITION` with zero budget or audit changes.
- [ ] **INV-08 / INV-09 (Audit & Transactional Atomicity):** Request status, Cost Center committed balance, financial commitment, idempotency record, and durable audit event commit or roll back atomically. Exactly one `APPROVED`/`REJECTED` audit event exists per decided request.
- [ ] **INV-10 (Recoverability):** Any pre-commit failure leaves the request `PENDING`, budget unchanged, and key reusable; post-commit lost responses recover cleanly via idempotent retry.
- [ ] **Architecture & Evidence:** Preserve Modular Monolith boundaries (`bun run check:static`, `bun run verify:architecture`), pass deterministic + runtime + concurrency + security + property + E2E checks against real PostgreSQL and Chromium, and submit a PR with revision-bound evidence for human review.

---

## Engineering Constraints

- Fix the root cause across persistence and application boundaries — do **not** add arbitrary `sleep()` delays, process-local mutexes (must hold across multiple app instances), swallowed errors, or weakened assertions.
- Use exact integer minor units (`MoneyMinor`); never use binary floating-point arithmetic for financial invariants.
- Keep existing purchase request submission idempotency, UI workflows, and API contracts intact.
- Do not modify acceptance criteria, ESLint architecture boundaries, or CI gates to force a green run.
- Do not approve or merge your own pull request.
