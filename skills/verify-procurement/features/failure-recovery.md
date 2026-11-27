# Feature Map: Failure Recovery

## User-Facing Behavior

When a database error interrupts a submission or approval before commit, Procurement Hub rolls back all partial changes cleanly so the request remains `PENDING`, budgets stay accurate, and the idempotency key stays reusable. When a network timeout drops the HTTP response **after** a successful commit, retrying with the same `Idempotency-Key` recovers the committed result without double-committing funds or duplicating audit events.

## Sub-features

- **Pre-commit rollback on creation failure:** Simulated audit insert constraint failure rolls back `purchase_requests` completely; subsequent retry with the same key succeeds (`201`).
- **Pre-commit rollback on approval failure:** Simulated `APPROVED` audit constraint failure rolls back `purchase_requests.status`, `cost_centers.committed_budget_minor`, `financial_commitments`, and `decision_idempotency_keys` completely; subsequent retry with the same key succeeds (`200`).
- **Post-commit lost-response recovery:** Client retries approval with the same `Idempotency-Key` after commit -> receives `200` (`replayed: true`) with exact `committedBudgetMinor`, `1` commitment, and `1` `APPROVED` audit event.
- **Migration safety on corrupted legacy databases:** Migration `0003` detects pre-existing overspent Cost Centers (`SQLSTATE 23514`) or duplicate commitments (`SQLSTATE 23505`) and aborts cleanly without deleting or mutating historical rows.

## Entry Points

- **API:** `POST /api/purchase-requests`, `POST /api/purchase-requests/:id/decision`
- **Database migrations:** `drizzle/0001_ensure_tenant_idempotency.sql`, `drizzle/0003_approval_integrity_constraints.sql`

## Preconditions

- Disposable PostgreSQL lab running (`bun run lab:doctor`).

## How to Get to It (User POV)

Failure recovery is primarily verified via deterministic integration, migration, and concurrency tests against real PostgreSQL constraints, plus UI retry retention in `PurchaseRequestForm` and `DecisionForm`.

## Driving It with the Harness

```bash
bun run test:integration
bun run test:migration
bun run test:concurrency
```

## Relevant Domain Rules & Related Invariants

- `INV-09` (Atomicity): all write side effects execute in one PostgreSQL transaction.
- `INV-10` (Recoverability): zero invalid intermediate state on failure; deterministic convergence on retry.

## Expected Observable Outcomes & Required Evidence

- After forced audit failure on approval: HTTP `500 INTERNAL_ERROR`, `purchase_requests.status = 'PENDING'`, `committed_budget_minor` unchanged, `financial_commitments` count = `0`, `decision_idempotency_keys` count = `0`; retry immediately succeeds (`200`) with exact counts `1`.
- On legacy overspent fixture DB: migration `0003` exits with `SQLSTATE 23514` and leaves all existing rows byte-identical.

## Gotchas & Known Limitations

- Fault injection for rollback tests installs and drops a temporary `NOT VALID` `CHECK` constraint inside a disposable test database only — never enabled in production.
