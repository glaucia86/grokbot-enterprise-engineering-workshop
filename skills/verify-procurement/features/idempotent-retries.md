# Feature Map: Idempotent Retries

## User-Facing Behavior

Both purchase submission (`POST /api/purchase-requests`) and approval decisions (`POST /api/purchase-requests/:id/decision`) require a client-supplied `Idempotency-Key`. If a client times out or retries an identical request with the same key, Procurement Hub converges cleanly on the original committed outcome without creating duplicate requests, duplicate financial commitments, double budget deductions, or duplicate audit events.

## Sub-features

- **Submission replay:** Equivalent retry returns HTTP `200` with original request ID and current status (even if subsequently approved).
- **Approval replay:** Equivalent retry after commit/timeout returns HTTP `200` with `replayed: true`, unchanged `committedBudgetMinor`, `1` financial commitment, and `1` `APPROVED` audit event.
- **Concurrent duplicate key retry:** Two simultaneous identical approval retries with the same `Idempotency-Key` serialize cleanly without throwing `500` or double-committing.
- **Conflict detection:** Reusing a key with a different request ID, different decision, different normalized reason, or different actor in the same tenant returns generic `409 IDEMPOTENCY_CONFLICT` without disclosing details of the original record.
- **Cross-tenant key independence:** Tenant A and Tenant B may independently use the exact same `Idempotency-Key` string without conflict.

## Entry Points

- **API:** `Idempotency-Key` header (`^[A-Za-z0-9_-]{1,128}$`) on `POST /api/purchase-requests` and `POST /api/purchase-requests/:id/decision`
- **UI:** `PurchaseRequestForm` and `DecisionForm` retain the generated UUID across retries while the normalized payload stays identical.

## Preconditions

- `bun run lab:doctor` passes.
- Reference solution migration `0003_approval_integrity_constraints.sql` applied for `decision_idempotency_keys`.

## How to Get to It (User POV)

- Triggered automatically when a user clicks **Submit request** or **Save decision** again after a transient network error without modifying form fields, or explicitly exercised via HTTP clients in integration and concurrency tests.

## Driving It with the Harness

```bash
bun run test:integration
bun run test:concurrency
bun run verify:concurrency
```

## Relevant Domain Rules & Related Invariants

- `INV-03`: Equivalent retries never create extra financial commitments or state transitions.
- `INV-04`: Semantic payload mismatch or different actor in same tenant yields generic `409 IDEMPOTENCY_CONFLICT`.
- `INV-06`: Authorization is re-verified **before** returning any idempotent approval replay.
- `INV-08`: Retries never write duplicate `CREATED`, `APPROVED`, or `REJECTED` audit events.
- `INV-10`: Failed attempts (`400`, `403`, `404`, `409 INSUFFICIENT_BUDGET`, `500`) never persist an idempotency key, so valid retries can still succeed.

## Expected Observable Outcomes & Required Evidence

- Repeated identical approval with key `K` returns `200` (`replayed: false` then `replayed: true`), `cost_centers.committed_budget_minor` incremented once, `financial_commitments` count = `1`, `audit_events` (`APPROVED`) count = `1`.
- Reusing key `K` with a different payload or actor returns `409` with exact body `{"error":{"code":"IDEMPOTENCY_CONFLICT"}}`.
- Different key `K2` targeting an already-approved request returns `409` with `{"error":{"code":"INVALID_TRANSITION"}}`.

## Gotchas & Known Limitations

- Idempotency keys do not expire in this disposable lab (TTL archival is out of scope).
- On `workshop/starter`, `decision_idempotency_keys` is absent, so approval retries fail with `409 INVALID_TRANSITION` rather than replaying `200`.
