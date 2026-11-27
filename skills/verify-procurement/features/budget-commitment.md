# Feature Map: Budget Commitment

## User-Facing Behavior

Each tenant maintains **Cost Centers** with exact USD minor-unit **Allocated Budget**, **Committed Budget**, and derived **Available Budget** (`allocated - committed`). Approving a purchase request creates exactly one durable **Financial Commitment** and increments the Cost Center's **Committed Budget** atomically. Rejecting a request or failing an approval leaves the budget completely unchanged.

## Sub-features

- Live Cost Center budget dashboard on `/` (`CC-ENG-01` `$10,000`, `CC-OPS-01` `$25,000`, `CC-MER-01` `$10,000`).
- Visual overspent alert (`budget-overspent` + `(OVERSPENT)` label) if available budget ever drops below `$0.00` (observable on the defective starter branch after `ph42:reproduce`).
- 1:1 durable `financial_commitments` ledger record displayed on `/requests/:id` after approval.
- Database-level defense-in-depth `CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor)` and `UNIQUE (tenant_id, request_id)` (installed in migration `0003`).

## Entry Points

- **UI:** `/` -> **Cost center budgets** table (`tr[data-cost-center-code="CC-ENG-01"]`), `/requests/:id` -> **Financial commitment** panel
- **API:** `GET /api/cost-centers`, `GET /api/purchase-requests/:id`, `POST /api/purchase-requests/:id/decision`

## Preconditions

- `bun run lab:doctor` confirms all 3 seeded Cost Centers exist.

## How to Get to It (User POV)

1. Sign in as any Northstar identity on `/`.
2. Inspect the **Cost center budgets** table (`Allocated`, `Committed`, `Available`).
3. Approve a pending request targeting `CC-ENG-01` or `CC-OPS-01`, return to `/`, and confirm `Committed` increased by the exact request amount and `Available` decreased identically.

## Driving It with the Harness

```bash
bun run ph42:reproduce
bun run test:concurrency
bun run test:migration
bun run test:properties
```

## Relevant Domain Rules & Related Invariants

- `INV-01`: `committed_budget_minor <= allocated_budget_minor` AND `committed_budget_minor == SUM(financial_commitments.amount_minor)` per Cost Center.
- `INV-02`: `available_budget_minor = allocated_budget_minor - committed_budget_minor >= 0`.
- `INV-09`: `cost_centers.committed_budget_minor` update and `financial_commitments` row insertion execute in the same ACID transaction as the approval.

## Expected Observable Outcomes & Required Evidence

- Before-and-after SQL snapshot of `cost_centers` and `financial_commitments` showing exact reconciliation (`committedBudgetMinor === commitmentsSumMinor` and `availableBudgetMinor >= 0`).
- Attempting to approve a request whose `amountMinor > availableBudgetMinor` returns `409 INSUFFICIENT_BUDGET` and leaves both tables unchanged.
- Migration `0003` refuses to apply (`SQLSTATE 23514`) if legacy data already contains an overspent Cost Center, preserving historical rows without silent deletion.

## Gotchas & Known Limitations

- Budget release/cancellation or mid-quarter budget top-ups are intentionally out of scope for this workshop lab.
- All monetary values are stored in integer USD cents (`1000000` = `$10,000.00`).
