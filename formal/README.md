# Formal Verification — Bounded TLA+ / TLC Model of PH-42 Concurrent Approvals

This directory contains the Layer 04 Trust Pyramid formal model for **Procurement Hub**'s concurrent financial approval protocol ([ADR-0005](../docs/adr/0005-bounded-formal-verification-with-tlaplus.md)).

## What Is Modeled

`ProcurementApproval.tla` models the exact PH-42 scenario under finite bounds:
- Cost Center `Allocated = 10` (representing `$10,000` in thousands)
- Two `PENDING` purchase requests `{r1, r2}`, each requiring `Amount = 7` (`$7,000`)
- Two concurrent approver workers `{w1, w2}` with idempotency keys `{k1, k2}`
- Lost-response retries (`LoseResponseAndRetry`) and key reuse conflicts

### Model-to-Code Correspondence

| TLA+ Action / Invariant | TypeScript / PostgreSQL Implementation |
| --- | --- |
| `ReadBudgetUnserialized` -> `CommitUnserialized` (`LockBudget = FALSE`) | Starter `decide()` reading `cost_centers` without `FOR UPDATE` and without `CHECK (committed <= allocated)` |
| `AtomicLockedApprove` (`LockBudget = TRUE`) | Reference `decide()` in `src/modules/procurement/infrastructure/postgres-requests.ts` using `SELECT ... FOR UPDATE` on `cost_centers` -> `purchase_requests` + `decision_idempotency_keys` + `financial_commitments` + `audit_events` in one transaction |
| `LoseResponseAndRetry` | Client retrying `POST /api/purchase-requests/:id/decision` with the same `Idempotency-Key` after an HTTP timeout |
| `BudgetNotExceeded` / `NonNegativeAvailability` | `INV-01` & `INV-02` (`cost_centers_budget_bounds_check` + `canCommitAmount`) |
| `CommitmentMatchesApprovedSum` / `AuditMatchesApproved` | `INV-08` & `INV-09` (`financial_commitments_tenant_request_unique` + atomic transaction) |
| `IdempotentReplayConsistent` | `INV-03` (`decision_idempotency_keys` primary key & replay path) |

## Run Locally (No Host Java Required)

```bash
bun run verify:formal --run-id ph42-formal-demo
```

`engineering/verify-formal.ts` automatically:
1. Uses native `java` (11+) if installed, **or** transparently falls back to a pinned Docker container (`eclipse-temurin:21-jre-alpine`) — zero host Java installation required because Docker is already used for PostgreSQL.
2. Uses a local `--jar` path if supplied, or downloads and caches official TLA+ v1.7.4 `tla2tools.jar` under `artifacts/.cache/` and verifies its exact SHA-256 digest (`936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88`).
3. Runs TLC (`-deadlock`, `-workers 1`, `-seed 4207`) on **both** configurations and writes `manifest.json`, `summary.md`, model copies, and raw logs to `artifacts/formal/<run-id>/`.

## Expected Results

| Configuration | Expected TLC Exit | What It Proves |
| --- | --- | --- |
| `defective-read-commit.cfg` (`LockBudget = FALSE`) | **12** (invariant violation) | Produces a concrete counterexample trace where `w1` and `w2` both observe `committed = 0`, pass `0 + 7 <= 10`, and commit `committed = 14 > 10` (`BudgetNotExceeded` violated). |
| `locked-atomic.cfg` (`LockBudget = TRUE`) | **0** (exhaustive pass) | Explores every reachable state (`0` states left on queue) and confirms all 6 invariants hold across all concurrent approvals, key conflicts, and lost-response retries within the stated bounds. |

## Explicit Scope & Limitations

- **Property-based tests (`fast-check`) are NOT formal verification.** They sample randomized inputs against TypeScript contracts (`bun run test:properties`).
- **Bounded TLC verification is NOT a proof of the TypeScript/PostgreSQL implementation.** It proves safety properties of the abstract transition model under the finite bounds above. Runtime concurrency, SQL constraints, authorization, and tenant isolation are independently verified by Layers 02 and 03 (`test:concurrency`, `test:security`, `test:migration`, `test:e2e`, `verify:all`).
