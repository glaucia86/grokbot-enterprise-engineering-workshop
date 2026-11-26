# ADR-0003 — Row-Level `FOR UPDATE` Locking and Database `CHECK` Constraints for Concurrent Approvals

**Status:** Accepted  
**Audience:** Instructor / Reference Solution (keep out of `workshop/starter` participant branch)  
**Date:** 2026-11-26

Concurrent approvals against the same **Cost Center** are serialized inside a single PostgreSQL `READ COMMITTED` transaction by locking the target `cost_centers` row (`SELECT ... FOR UPDATE`) before locking `purchase_requests` (`SELECT ... FOR UPDATE`), validating available budget, and reinforcing the invariant with a database-level `CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor)` constraint and `UNIQUE (tenant_id, request_id)` on `financial_commitments`.

## Considered Options

- **Application-level read-then-check-then-update under `READ COMMITTED` (Starter Defect):** Fails under concurrency. Two simultaneous approvals both read `committed = 0 <= 10,000` and each add `7,000`, resulting in `committed = 14,000` (`available = -4,000`), violating `INV-01` and `INV-02`.
- **In-process JavaScript mutex / semaphore:** Rejected. Breaks across multiple Next.js server instances, serverless workers, or independent processes sharing PostgreSQL.
- **PostgreSQL `SERIALIZABLE` isolation for all approval transactions:** Valid mathematically, but introduces spurious serialization failure retries (`SQLSTATE 40001`) on unrelated SSI predicate overlaps, requiring complex retry loops that must still preserve idempotency and error mapping. Overkill when contention is scoped to a single `cost_centers` row.
- **Optimistic concurrency control (`WHERE version = $expected`):** Avoids holding row locks during check, but under burst contention forces callers or application retry loops to replay full transactions and still needs a DB `CHECK` constraint to guarantee safety.
- **Single conditional `UPDATE cost_centers SET committed_budget_minor = committed_budget_minor + $amount WHERE id = $id AND committed_budget_minor + $amount <= allocated_budget_minor` without `FOR UPDATE`:** Actually safe for the budget counter itself under PostgreSQL `READ COMMITTED` (because PostgreSQL re-evaluates the `WHERE` predicate against the latest committed row version), **provided** lock order with `purchase_requests` cannot deadlock and idempotency key reservation happens atomically. Pairing explicit `SELECT ... FOR UPDATE` on `cost_centers` first, then `purchase_requests`, gives explicit deadlock-free lock ordering (`cost_centers -> purchase_requests`), clear domain error distinction (`NOT_FOUND` vs `INVALID_TRANSITION` vs `INSUFFICIENT_BUDGET`), AND exact alignment with the `ProcurementApproval.tla` formal model.
- **Pessimistic `SELECT ... FOR UPDATE` + DB `CHECK` + `UNIQUE (tenant_id, request_id)` (Chosen):** Enforces `INV-01`, `INV-02`, `INV-07`, `INV-08`, and `INV-09` across unlimited app instances with zero spurious retry storms, clean deterministic error codes, and defense in depth even if a future migration or SQL script bypasses application code.

## Consequences

- Concurrent approvals targeting the **same** cost center serialize briefly (microseconds to milliseconds) on that single cost center row; approvals targeting **different** cost centers or tenants execute in full parallel with zero lock contention.
- Lock acquisition order is fixed (`cost_centers` first, then `purchase_requests`) across all write paths to prevent circular deadlocks.
- Upgrade migration `0003_approval_integrity_constraints.sql` acquires an `ACCESS EXCLUSIVE` lock, verifies zero pre-existing overspent cost centers or duplicate commitments (failing with `23514` / `23505` rather than silently deleting data), and then installs the constraints.
