# Feature Map: Audit Trail

## User-Facing Behavior

Every purchase request maintains an ordered, tenant-scoped durable audit history capturing its `CREATED` event and at most one terminal decision event (`APPROVED` or `REJECTED`), attributed to the acting user's display name, UTC timestamp, and optional/required decision reason.

## Sub-features

- Chronological audit view (`CREATED` -> `APPROVED` or `REJECTED`) visible to same-tenant `APPROVER` and `AUDITOR` actors.
- Strict read-only access for `AUDITOR` (no create form, no decision form, `403` on all write APIs).
- Zero duplicate audit events under submission retries, approval retries, or concurrent races.
- Atomic persistence with the state mutation (rolled back completely on failure).

## Entry Points

- **UI:** `/requests/:id` -> **Audit trail** panel (ordered list `<ol class="audit-list">`)
- **API:** `GET /api/purchase-requests/:id/audit`

## Preconditions

- Active session is a same-tenant `APPROVER` or `AUDITOR`.

## How to Get to It (User POV)

1. Create a purchase request as **Northstar Requester**, approve or reject it as **Northstar Approver**.
2. Switch to **Northstar Auditor**, open the request from **Tenant requests**, and verify **Audit trail** lists exactly 2 items (`CREATED` by Northstar Requester, followed by `APPROVED`/`REJECTED` by Northstar Approver with reason if provided).

## Driving It with the Harness

- **Browser selectors:** `getByRole("region", { name: "Audit trail" }).getByRole("listitem")`.
- **Verification commands:**

```bash
bun run test:integration
bun run test:concurrency
bun run test:e2e tests/e2e/decision.spec.ts
```

## Relevant Domain Rules & Related Invariants

- `INV-08` (Audit consistency): exact 1:1 durable event per successful creation and terminal decision; zero duplicates on retries.
- `INV-09` (Atomicity): audit writes commit or roll back with the purchase request and financial commitment.

## Expected Observable Outcomes & Required Evidence

- PostgreSQL `audit_events` holds exact count `1` (`CREATED`) for `PENDING` requests and exact count `2` (`CREATED` + `APPROVED`/`REJECTED`) for decided requests — even after repeated retries or concurrent contention.
- `GET /api/purchase-requests/:id/audit` returns `403 FORBIDDEN` for `REQUESTER` and `404 NOT_FOUND` for foreign-tenant actors.

## Gotchas & Known Limitations

- Full cryptographic tamper-evident WORM audit chaining is out of scope for this workshop lab.
