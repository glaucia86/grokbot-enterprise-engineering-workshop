# PH-42 Guided Investigation & Implementation Worksheet

Work through these progressive milestones in order. Only expand the next hint after checking your own hypothesis against the running application and PostgreSQL.

---

## Milestone 1 — Reproduce & Observe Real State

1. Boot the lab (`bun run lab:bootstrap` + `bun run dev` in Terminal 2).
2. Run `bun run ph42:reproduce`.
3. Inspect the JSON output (`before` vs `after`) and refresh `http://127.0.0.1:3000` as **Northstar Approver**.

**Checkpoint Question 1:** Which exact invariants (`INV-01`–`INV-10`) are broken, and why did `bun run test:integration` still pass on this branch?

<details>
<summary>Hint 1</summary>
Single-request sequential tests never open two overlapping approval transactions against the same Cost Center. Inspect `decide()` in `src/modules/procurement/infrastructure/postgres-requests.ts` and `drizzle/0002_cost_centers_and_commitments.sql`.
</details>

---

## Milestone 2 — Diagnose the Concurrency & Schema Root Causes

Inspect `decide()` line by line and compare against `PRD.md` (`INV-01`–`INV-10`).

**Checkpoint Question 2:** What happens when two PostgreSQL `READ COMMITTED` transactions both execute `SELECT ... FROM cost_centers` before either executes `UPDATE cost_centers`?

<details>
<summary>Hint 2A — Locking</summary>
Without a row-level lock (`SELECT ... FOR UPDATE`), both transactions read `committed_budget_minor = 0`, both pass `0 + 700000 <= 1000000`, and both execute `committed_budget_minor = committed_budget_minor + 700000` -> `1400000`. Think carefully about lock ordering (`cost_centers` vs `purchase_requests`) to avoid deadlocks!
</details>

<details>
<summary>Hint 2B — Defense in Depth</summary>
What database constraints should make overspending and duplicate commitments impossible in PostgreSQL even if application code has a bug? Look at `cost_centers.committed_budget_minor` (`CHECK`) and `financial_commitments(tenant_id, request_id)` (`UNIQUE`). Remember that a safe migration must refuse dirty legacy data instead of silently deleting rows!
</details>

---

## Milestone 3 — Design Approval Idempotency & Auth-Before-Replay

Run `bun run test:security` and observe which security & idempotency tests fail on the starter baseline.

**Checkpoint Question 3:** Why is checking `status === 'PENDING'` alone insufficient when an HTTP response is lost after commit? And why is returning a cached `200` immediately upon `Idempotency-Key` match a security flaw?

<details>
<summary>Hint 3</summary>
1. Without a `decision_idempotency_keys` table keyed by `(tenant_id, idempotency_key)`, retrying after a timeout fails with `409 INVALID_TRANSITION` instead of safely replaying `200`.
2. Reusing a key with a different request ID, decision, normalized reason, or actor in the same tenant must return generic `409 IDEMPOTENCY_CONFLICT` with zero details leaked (`INV-04`).
3. Always re-evaluate `evaluateApprovalAuthority()` against live DB membership BEFORE returning an idempotent replay (`INV-06`), and roll back the key reservation if the request is rejected (`INSUFFICIENT_BUDGET`, `INVALID_TRANSITION`, or DB failure — `INV-10`).
</details>

---

## Milestone 4 — Verify Across All Trust Pyramid Layers

After implementing migration `0003` and updating `decide()` (and removing the lab sync barrier from the approval route/repository):

```bash
bun run lab:reset && bun run lab:init
bun run check:static
bun run verify:architecture
bun run ph42:reproduce          # Expect EXIT 0 ([200, 409 INSUFFICIENT_BUDGET], $7k committed, $3k available)
bun run test:unit
bun run test:integration
bun run test:concurrency
bun run test:security
bun run test:properties
bun run test:e2e
```

---

## Milestone 5 — Formal Model Checking & Evidence-Based PR

```bash
bun run verify:formal --run-id guided-formal
bun run verify:all --slice solution --run-id guided-final
```

Compare `artifacts/verification/solution/guided-final/summary.md` and `artifacts/formal/guided-formal/summary.md` against `.github/pull_request_template.md`.
