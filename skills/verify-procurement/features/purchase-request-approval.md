# Feature Map: Purchase Request Approval

## User-Facing Behavior

An authorized `APPROVER` inspects a `PENDING` purchase request submitted by another user in the same tenant, reviews the Cost Center's allocated/committed/available budget, and records either `APPROVE` (optionally with a reason) or `REJECT` (mandatory reason). Approved requests commit funds atomically and transition to terminal `APPROVED`; rejected requests transition to `REJECTED` without committing funds.

## Sub-features

- Single-request `APPROVE` and `REJECT` transitions (`PENDING -> APPROVED | REJECTED`).
- Concurrent approval serialization against shared Cost Center budgets (`PH-42` core scenario: `$7,000 + $7,000` vs `$10,000`).
- Competing `APPROVE` vs `REJECT` race on the same request (`200` winner + `409 INVALID_TRANSITION` loser).
- Terminal state immutability (`APPROVED`/`REJECTED` cannot be changed even with a fresh `Idempotency-Key`).

## Entry Points

- **UI:** `/requests/:id` -> **Record decision** panel (`DecisionForm`)
- **API:** `POST /api/purchase-requests/:id/decision` (requires `Idempotency-Key` header, same-origin header, and active `APPROVER` session)

## Preconditions

- `bun run lab:doctor` passes.
- At least one `PENDING` purchase request exists in the approver's tenant submitted by a different user.
- For the PH-42 demo scenario, run `bun run lab:seed:ph42` to initialize `CC-ENG-01` (`$10,000`) with Request A (`$7,000`) and Request B (`$7,000`).

## How to Get to It (User POV)

1. Switch to **Northstar Approver** on `/` and inspect **Cost center budgets** (`CC-ENG-01`).
2. Click a `PENDING` request under **Tenant requests** to open `/requests/:id`.
3. In **Record decision**, choose **Approve** (or **Reject** + **Rejection reason**) and click **Save decision**.
4. Observe the status badge change to `APPROVED` (or `REJECTED`), the **Record decision** panel disappear, the **Financial commitment** panel appear on approval, and the **Audit trail** gain the terminal event.

## Driving It with the Harness

- **Browser selectors:** `getByRole("region", { name: "Record decision" })`, `getByLabel("Decision")`, `getByLabel("Rejection reason")`, `getByRole("button", { name: "Save decision" })`, `getByRole("article").getByRole("status")`.
- **Verification commands:**

```bash
bun run ph42:reproduce
bun run test:concurrency
bun run test:integration
bun run test:e2e tests/e2e/decision.spec.ts
```

## Relevant Domain Rules & Related Invariants

- `INV-01` & `INV-02`: concurrent approvals can never exceed `allocatedBudgetMinor` or yield negative `availableBudgetMinor`.
- `INV-06`: role must be `APPROVER`, non-self, same tenant, and `amountMinor <= approvalLimitMinor`.
- `INV-07`: strictly `PENDING -> APPROVED | REJECTED`; subsequent transitions return `409 INVALID_TRANSITION`.
- `INV-08` & `INV-09`: status update, budget increment, financial commitment, idempotency key, and audit event commit atomically.

## Expected Observable Outcomes & Required Evidence

- **PH-42 concurrent test (`$7k + $7k` vs `$10k`):**
  - On `workshop/starter`: `bun run ph42:reproduce` exits `1`, both HTTP calls return `200`, PostgreSQL shows `committed_budget_minor = 1400000` (`-$4,000` available).
  - On `workshop/solution`: `bun run ph42:reproduce` exits `0`, HTTP statuses `[200, 409]` (`INSUFFICIENT_BUDGET`), PostgreSQL shows `committed_budget_minor = 700000` (`$3,000` available), `commitmentsCount = 1`, `approvedRequestCount = 1`, `approvedAuditCount = 1`.

## Gotchas & Known Limitations

- Missing `Idempotency-Key` header returns `400 INVALID_INPUT` and does not start a transaction.
- `northstar-junior-approver` (limit `$5,000`) can still **Reject** a `$7,000` request, but attempting **Approve** returns `403 APPROVAL_LIMIT_EXCEEDED`.
