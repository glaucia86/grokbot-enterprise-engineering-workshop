# ADR-0001 — Enforce purchase request idempotency at the persistence boundary

**Status:** proposed | **Audience:** instructor/reference solution only | **Date:** 2026-11-25

## Context

The planned starter handles sequential replay with a read-then-insert pattern and no database uniqueness constraint on the tenant/key pair. Concurrent requests can both observe absence, then both insert and append creation events. The invariant must hold across separate processes and database connections. A single in-memory lock is insufficient.

## Decision

Reference implementation proposal: add a non-null composite unique constraint `(tenant_id, idempotency_key)` and use an atomic insert-or-conflict operation under PostgreSQL READ COMMITTED. Creation and the CREATED audit event share one database transaction. No hard deletion or key expiration is supported in the lab.

1. Validate the request and resolve membership, actor and tenant from the server-side session. Derive canonical content and hash from the validated normalized fields.
2. Attempt INSERT with `ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING ...`.
3. If a row is returned, insert the CREATED audit event in the same transaction, commit and return 201. On any failure, roll back both writes. Never report success before commit.
4. If no row is returned, read the existing row using a **separate SQL statement** in the READ COMMITTED transaction, scoped to tenant and key. Do not depend on a same-statement CTE snapshot to see a conflicting concurrent row. Return 200 only if requester identity and normalized payload match; otherwise return a generic 409 without exposing its contents. The fingerprint can speed comparison; canonical fields can be checked to make payload equality explicit. No audit event for replay or conflict. If an unexpected missing row occurs, report an explicit integrity/retryable error rather than inserting without the uniqueness protection.
5. Return the current resource representation; the original request ID is stable even if later approval changes status. A failed winning transaction permits a competing insert to succeed under the constraint.

PostgreSQL READ COMMITTED uses a fresh statement snapshot. An INSERT may encounter a conflicting row that was invisible in that statement's snapshot; a subsequent statement can read the committed row. Validate the exact ORM/driver behavior and isolation level through integration tests. See [transaction isolation](https://www.postgresql.org/docs/18/transaction-iso.html) and [INSERT](https://www.postgresql.org/docs/18/sql-insert.html).

## Migration safety

Before adding the constraint, query existing duplicate tenant/key groups. If duplicates exist, abort the lab migration with a clear error and do not delete or consolidate records automatically. Document that real remediation requires a business-approved reconciliation and audit plan. The workshop solution uses a clean synthetic baseline database; the reproduction data is disposable and reset explicitly before migration. Test both clean migration and rejection of pre-existing duplicates. Production rolling migration and lock/downtime strategy are out of scope.

## Alternatives rejected

- Check-then-insert without database protection: race across transactions.
- Process-local mutex: not cross-instance safe.
- Delay/retry alone: can hide symptoms, does not enforce uniqueness.
- Broad SERIALIZABLE conversion: may be valid but adds retry and isolation complexity beyond this focused lab; not needed for this single-key invariant if the chosen constraint/transaction design is sound.
- Blind conflict update: risks overwriting original request or repeating side effects.

## Verification obligations

- Failing deterministic regression and real HTTP reproduction on the starter.
- Reference migration on clean data and rejection of dirty data.
- Same-tenant equivalent replay, conflicting payload, different requester, independent tenants, rollback when audit fails, ordinary approval path.
- Independent CI and human review. Formal model is optional; no proof of implementation is claimed.

Keep this ADR out of the starter's participant-facing materials until the solution is intentionally disclosed.
