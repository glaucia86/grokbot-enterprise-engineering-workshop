---
name: verify-formal-approval
description: Run bounded TLA+/TLC model checking on Procurement Hub's concurrent financial approval protocol (formal/ProcurementApproval.tla). Use whenever changing approval locking, budget commitment, decision idempotency, or approval audit transitions.
---

# Verify Formal Approval Invariants (TLA+ / TLC)

Portable, repository-local formal verification skill (independent adaptation of Lauren Tan's `pstack` `create-formal-verification-skill` contract).

## Plain-English Promise & Harm

- **Promise:** Under any interleaving of concurrent approvals, retries, and lost responses on a Cost Center, total committed funds never exceed allocated budget, available budget never becomes negative, approved requests reconcile 1:1 with financial commitments and `APPROVED` audit events, and idempotent retries never double-commit.
- **Harm if broken:** Two concurrent `$7,000` approvals against a `$10,000` Cost Center both succeed, overspending the budget to `$14,000` (`-$4,000` available) or double-charging on retry.

## Coverage Record & Code Correspondence

- **Covered files:**
  - `src/modules/procurement/domain/procurement.ts` (`canCommitAmount`, `canTransitionStatus`, `addCommittedAmount`)
  - `src/modules/procurement/infrastructure/postgres-requests.ts` (`decide()`)
  - `drizzle/0003_approval_integrity_constraints.sql` (`cost_centers_budget_bounds_check`, `financial_commitments_tenant_request_unique`, `decision_idempotency_keys`)
- **Last confirmed sync commit:** Updated upon Phase 06 solution verification (see `artifacts/formal/<run-id>/manifest.json`).
- **Sync rule:** If `git diff <sync-commit>..HEAD -- src/modules/procurement/ drizzle/` changes approval locking, budget updates, or idempotency semantics, re-check correspondence between `formal/ProcurementApproval.tla` actions and the TypeScript/SQL implementation before moving the sync commit forward.

## Run One Command (No Host Java Required)

```bash
bun run verify:formal --run-id ph42-formal-check
```

`engineering/verify-formal.ts` automatically uses native `java` (11+) if installed, or transparently falls back to a pinned Docker container (`eclipse-temurin:21-jre-alpine`) with SHA-256-verified official `tla2tools.jar` (TLA+ v1.7.4).

## Expected Dual-Config Proof ("Able to Fail")

1. **`formal/defective-read-commit.cfg` (`LockBudget = FALSE`):**
   - **Must fail** with TLC exit code `12` and counterexample violating `BudgetNotExceeded`.
   - Plain-English counterexample: Worker 1 reads `committed = 0` for Request 1 (`7 <= 10`), Worker 2 reads `committed = 0` for Request 2 (`7 <= 10`), Worker 1 commits (`committed = 7`), Worker 2 commits (`committed = 14 > 10`).
2. **`formal/locked-atomic.cfg` (`LockBudget = TRUE`):**
   - **Must pass** with TLC exit code `0`, `No error has been found.`, and `0` states left on queue across the exhaustive finite state space, verifying:
     - `TypeOK`
     - `BudgetNotExceeded` (`INV-01`)
     - `NonNegativeAvailability` (`INV-02`)
     - `CommitmentMatchesApprovedSum` (`INV-01`, `INV-09`)
     - `AuditMatchesApproved` (`INV-08`, `INV-09`)
     - `IdempotentReplayConsistent` (`INV-03`)

## Interpreting Findings vs. Modeling Errors

- **Real design bug:** Counterexample steps map directly to real SQL statements and transaction boundaries in `postgres-requests.ts`. Fix the implementation (and keep the property strict).
- **Modeling error:** A transition in `ProcurementApproval.tla` splits or merges an operation that is actually atomic/non-atomic in PostgreSQL. Align the model honestly to the code; never weaken an invariant to force a pass.

## Honest Scope & Limitations

- Finite model bounds: `Allocated = 10`, two pending requests `{r1, r2}` each with `Amount = 7`, two concurrent approver workers `{w1, w2}`, idempotency keys `{k1, k2}`, including lost-response retry transitions.
- Passing TLC proves the **modeled concurrency protocol** holds within these finite bounds. It does **not** formally prove TypeScript compilation, Drizzle ORM SQL generation, HTTP validation, authorization revocation, or PostgreSQL engine internals — those are verified by Vitest, `fast-check`, concurrency, security, and Playwright suites.
