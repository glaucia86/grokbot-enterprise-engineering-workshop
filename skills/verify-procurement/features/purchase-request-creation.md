# Feature Map: Purchase Request Creation

## User-Facing Behavior

An authenticated `REQUESTER` selects one of their tenant's **Cost Centers**, enters a purchase title, business justification, and positive USD amount in integer cents, and submits a **Purchase Request**. The request begins in `PENDING` status and immediately appears in **My requests** and at `/requests/:id` without modifying the Cost Center's committed budget yet.

## Sub-features

- Selecting a tenant-scoped Cost Center with visible available budget (`CC-ENG-01`, `CC-OPS-01`, `CC-MER-01`).
- Validating title (1–120 chars), justification (1–2,000 chars), positive safe-integer `amountMinor`, fixed currency `USD`, and well-formed UTF-8 without NUL bytes.
- Client-side retention of `Idempotency-Key` across retries of unchanged payloads; generation of a new key when input changes.
- Atomic creation of one `PENDING` purchase request and one `CREATED` audit event.

## Entry Points

- **UI:** `/` -> **New purchase request** form (`PurchaseRequestForm`)
- **API:** `POST /api/purchase-requests` (requires `Idempotency-Key` header + session cookie + same-origin header)
- **Read API:** `GET /api/cost-centers`, `GET /api/purchase-requests`, `GET /api/purchase-requests/:id`

## Preconditions

- `bun run lab:doctor` passes.
- Active session is a seeded `REQUESTER` (e.g., `northstar-requester`).
- Selected `costCenterId` belongs to the active session's tenant.

## How to Get to It (User POV)

1. Open `http://127.0.0.1:3000/`.
2. Select **Northstar Requester** from **Lab identity** and click **Switch identity**.
3. Locate **New purchase request**, choose a **Cost center**, fill **Title**, **Justification**, and **Amount (USD cents)**, then click **Submit request**.

## Driving It with the Harness

- **Browser selectors:** `getByLabel("Cost center", { exact: true })`, `getByLabel("Title")`, `getByLabel("Justification")`, `getByLabel("Amount (USD cents)")`, `getByRole("button", { name: "Submit request" })`.
- **Verification commands:**

```bash
bun run test:unit
bun run test:integration
bun run verify:concurrency
bun run test:e2e tests/e2e/procurement.spec.ts
```

## Relevant Domain Rules & Related Invariants

- `INV-03` (Idempotency): concurrent/sequential identical submissions return one request ID (`201` + `200`).
- `INV-04` (Payload consistency): same key + different payload or requester returns generic `409 IDEMPOTENCY_CONFLICT`.
- `INV-05` (Tenant isolation): referencing a foreign tenant's `costCenterId` returns `404 NOT_FOUND` with zero writes.
- `INV-08` (Audit consistency): exactly one `CREATED` audit event written in the same transaction.

## Expected Observable Outcomes & Required Evidence

- HTTP `201` on creation (`200` on replay) with trimmed `title`/`justification`, exact integer `amountMinor`, `status: "PENDING"`, and matching `costCenterCode`.
- PostgreSQL `purchase_requests` count = `1` and `audit_events` (`CREATED`) count = `1` for `(tenant_id, idempotency_key)`.
- `cost_centers.committed_budget_minor` remains unchanged on creation (budget commits only upon `APPROVE`).

## Gotchas & Known Limitations

- `APPROVER` and `AUDITOR` roles do not see the creation form in the UI and receive `403 FORBIDDEN` via API.
- Only `USD` minor units are supported; decimal floats (`12.50`) or `0` are rejected with `400 INVALID_INPUT`.
