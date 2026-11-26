# Tenant isolation and audit

Create a purchase as **Northstar Requester** and keep its detail URL. Switch to **Northstar Auditor**, open it from **Tenant requests** and confirm **Audit trail** contains **CREATED**. After a decision, the trail contains the decision and its actor. The auditor views the request through the read-only interface.

Switch to **Meridian Requester**. The Northstar title is absent from that tenant’s list and opening its detail URL returns HTTP 404.

```bash
bun run test:e2e tests/e2e/procurement.spec.ts tests/e2e/decision.spec.ts
bun run test:integration
bun run verify:concurrency
```

The integration suite checks list and detail scope, audit authorization at `GET /api/purchase-requests/<id>/audit` and transactional audit behavior. Use the live concurrency result for the persisted creation-event count. It should show one event for the test request.
