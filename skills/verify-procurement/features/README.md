# Procurement Hub Feature Map

User-POV and agent-executable verification index for **Procurement Hub**. Run `bun run lab:doctor` before exercising individual features. Every feature links user-visible behavior, API/UI entry points, domain invariants (`INV-01`–`INV-10`), exact verification commands, and required database/runtime evidence.

| # | Feature Map | Primary Entry Points | Invariants Covered | Primary Verification Command |
| --- | --- | --- | --- | --- |
| 1 | [Purchase Request Creation](purchase-request-creation.md) | `/` form · `POST /api/purchase-requests` · `GET /api/cost-centers` | `INV-03`, `INV-04`, `INV-05`, `INV-08` | `bun run test:integration` · `bun run test:e2e` |
| 2 | [Purchase Request Approval](purchase-request-approval.md) | `/requests/:id` · `POST /api/purchase-requests/:id/decision` | `INV-01`, `INV-02`, `INV-07`, `INV-08`, `INV-09` | `bun run ph42:reproduce` · `bun run test:concurrency` |
| 3 | [Budget Commitment](budget-commitment.md) | `/` Cost Center table · `GET /api/cost-centers` · `financial_commitments` | `INV-01`, `INV-02`, `INV-09` | `bun run ph42:reproduce` · `bun run test:concurrency` |
| 4 | [Idempotent Retries](idempotent-retries.md) | `Idempotency-Key` on `POST /api/purchase-requests` & `/decision` | `INV-03`, `INV-04`, `INV-06`, `INV-08`, `INV-10` | `bun run test:integration` · `bun run test:concurrency` |
| 5 | [Tenant Isolation](tenant-isolation.md) | Northstar vs Meridian sessions across all routes | `INV-05` | `bun run test:security` · `bun run test:e2e` |
| 6 | [Authorization](authorization.md) | Role (`REQUESTER`/`APPROVER`/`AUDITOR`), non-self, `approvalLimitMinor`, replay auth | `INV-06` | `bun run test:security` · `bun run test:unit` |
| 7 | [Audit Trail](audit-trail.md) | `/requests/:id` Audit panel · `GET /api/purchase-requests/:id/audit` | `INV-08`, `INV-09` | `bun run test:integration` · `bun run test:e2e` |
| 8 | [Failure Recovery](failure-recovery.md) | Pre-commit DB rollback · post-commit lost-response replay · migration refusal | `INV-09`, `INV-10` | `bun run test:integration` · `bun run test:migration` |

> **Maintenance Rule:** A verification proof that only checks one happy-path route is incomplete when the feature map lists concurrency, conflict, security, and recovery paths. Keep these files updated whenever routes, selectors, or invariants change.
