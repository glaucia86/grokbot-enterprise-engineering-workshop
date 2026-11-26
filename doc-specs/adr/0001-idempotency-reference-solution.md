# ADR-0001 — Enforce purchase request idempotency at the persistence boundary

**Status:** implemented in VS-05 | **Audience:** instructor/reference solution only | **Date:** 2026-11-25

## Context

The PH-42 historical snapshot represents a legacy read-then-insert implementation without a tenant/key uniqueness constraint. The runnable VS-04 baseline already uses an atomic insert and includes the constraint in its initial migration. VS-05 adds an upgrade for legacy databases and makes the normalized stored fields authoritative for replay. The invariant holds across separate processes and database connections.

## Decision

Use a non-null composite unique constraint `(tenant_id, idempotency_key)` and an atomic insert-or-conflict operation under PostgreSQL READ COMMITTED. Creation and the CREATED audit event share one database transaction. The lab retains the request and its key for replay.

1. Validate the request and resolve membership, actor and tenant from the server-side session. Derive canonical content and hash from the validated normalized fields.
2. Attempt INSERT with `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING ...`.
3. If a row is returned, insert the CREATED audit event in the same transaction, commit and return 201. On any failure, roll back both writes. Never report success before commit.
4. If no row is returned, read the existing row using a **separate SQL statement** in the READ COMMITTED transaction, scoped to tenant and key. Return 200 when requester identity and the stored normalized fields match. Historical fingerprints may differ. A different requester or payload returns a generic 409. Replay and conflict leave the audit trail as-is. A missing row after a conflict raises an integrity error that the API maps to its generic 500 response.
5. Return the current resource representation; the original request ID is stable even if later approval changes status. A failed winning transaction permits a competing insert to succeed under the constraint.

PostgreSQL READ COMMITTED uses a fresh statement snapshot. An INSERT may encounter a conflicting row that was invisible in that statement's snapshot; a subsequent statement can read the committed row. Validate the exact ORM/driver behavior and isolation level through integration tests. See [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) and [INSERT](https://www.postgresql.org/docs/18/sql-insert.html).

## Migration safety

Migration `0001_ensure_tenant_idempotency.sql` preserves the tracked initial migration and runs inside Drizzle's migration transaction. It takes a table lock, checks for the existing constraint, and checks for duplicate tenant/key pairs before adding a missing constraint. On duplicates, it reports a reconciliation error with SQLSTATE `23505` and preserves the requests, audit events and journal. Reconcile real duplicates through a business-approved process with audit oversight. The lab verification creates and discards its own test databases.

## Alternatives rejected

- Check-then-insert without database protection: race across transactions.
- Process-local mutex: not cross-instance safe.
- Delay/retry alone: can hide symptoms, does not enforce uniqueness.
- Broad SERIALIZABLE conversion: may be valid but adds retry and isolation complexity beyond this focused lab; not needed for this single-key invariant if the chosen constraint/transaction design is sound.
- Blind conflict update: risks overwriting original request or repeating side effects.

## Verification obligations

- Deterministic regressions on the migration and replay paths. Capture the historical snapshot and the live HTTP observation as distinct evidence.
- Reference migration on clean data and rejection of dirty data.
- Same-tenant equivalent replay, conflicting payload, different requester, independent tenants, rollback when audit fails, ordinary approval path.
- Independent CI and human review. Formal model is optional; no proof of implementation is claimed.

Keep this ADR out of the starter's participant-facing materials until the solution is intentionally disclosed.
