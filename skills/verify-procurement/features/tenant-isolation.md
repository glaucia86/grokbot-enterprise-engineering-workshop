# Feature Map: Tenant Isolation

## User-Facing Behavior

Procurement Hub hosts two independent corporate tenants (**Northstar Industries** and **Meridian Retail**). Every cost center, purchase request, financial commitment, idempotency key namespace, and audit event is strictly isolated to its owning tenant. Attempting to access or mutate a resource belonging to another tenant returns `404 NOT_FOUND` without disclosing existence.

## Sub-features

- Server-derived `tenantId` resolved strictly from `lab_sessions` + `memberships` (client-supplied `tenantId` in JSON body is rejected with `400 INVALID_INPUT`).
- Composite tenant foreign keys `(tenant_id, id)` across `cost_centers`, `purchase_requests`, `financial_commitments`, `audit_events`, and `decision_idempotency_keys`.
- Cross-tenant Cost Center reference rejection (`404 NOT_FOUND` when Meridian submits against Northstar `CC-ENG-01`).
- Cross-tenant read, approval, and audit denial (`404 NOT_FOUND`).
- Independent idempotency key namespaces across tenants (same key succeeds independently in Northstar and Meridian).

## Entry Points

- **UI:** `/` identity switcher (`northstar-*` vs `meridian-*`), direct navigation to `/requests/<foreign-id>`
- **API:** `GET /api/cost-centers`, `GET/POST /api/purchase-requests`, `GET /api/purchase-requests/:id`, `POST /api/purchase-requests/:id/decision`, `GET /api/purchase-requests/:id/audit`

## Preconditions

- `bun run lab:doctor` confirms both tenants (`Northstar Industries`, `Meridian Retail`) and all 3 Cost Centers are seeded.

## How to Get to It (User POV)

1. Sign in as **Northstar Requester**, create a request, and copy its `/requests/<id>` URL.
2. Switch to **Meridian Requester**, **Meridian Approver**, or **Meridian Auditor**.
3. Confirm `/` shows only Meridian's Cost Center (`CC-MER-01`) and zero Northstar requests.
4. Visit the copied `/requests/<id>` URL and confirm HTTP `404` with zero Northstar title or budget leakage.

## Driving It with the Harness

```bash
bun run test:security
bun run test:integration
bun run test:e2e tests/e2e/procurement.spec.ts
```

## Relevant Domain Rules & Related Invariants

- `INV-05` (Tenant isolation): zero cross-tenant reads, mutations, or existence disclosure.

## Expected Observable Outcomes & Required Evidence

- Foreign `GET /api/purchase-requests/:id`, `POST /api/purchase-requests/:id/decision`, `GET /api/purchase-requests/:id/audit`, and `POST /api/purchase-requests` with foreign `costCenterId` all return HTTP `404` with exact body `{"error":{"code":"NOT_FOUND"}}`.
- Submitting with the same `Idempotency-Key` in Northstar and Meridian produces two distinct requests (`201` + `201`) and zero conflict.

## Gotchas & Known Limitations

- Tenant isolation is enforced by server-side queries plus PostgreSQL composite foreign keys; database Row-Level Security (RLS) is out of scope for this workshop lab.
