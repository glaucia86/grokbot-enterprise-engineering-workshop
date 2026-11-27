# Feature Map: Authorization

## User-Facing Behavior

Procurement Hub enforces server-side role-based access control (`REQUESTER`, `APPROVER`, `AUDITOR`), ownership rules, separation of duties (no self-approval), and organizational monetary approval limits (`approvalLimitMinor`) across every API route — including idempotent replay paths.

## Sub-features

- **Role boundaries:** Only `REQUESTER` submits requests; only `APPROVER` records decisions; `AUDITOR` and `APPROVER` read tenant audit trails (`REQUESTER` receives `403` on `/audit`).
- **Requester ownership:** `northstar-requester-alt` cannot read `northstar-requester`'s requests (`404 NOT_FOUND`).
- **Separation of duties:** An actor who created a request (even if later promoted to `APPROVER`) receives `403 FORBIDDEN` when attempting to decide their own request.
- **Organizational approval limits:** `northstar-junior-approver` (`approvalLimitMinor = $5,000.00`) can approve requests `<= $5,000.00` and reject any pending request, but attempting to approve a `$7,000.00` request returns `403 APPROVAL_LIMIT_EXCEEDED`.
- **Auth-before-replay (`INV-06`):** If an approver's role is revoked or their `approvalLimitMinor` is lowered after a successful approval, replaying the original `Idempotency-Key` returns `403` instead of leaking the cached `200` decision.
- **Session revocation:** Switching lab identities deletes the previous session token from `lab_sessions`.

## Entry Points

- **UI:** `/` identity switcher (`Lab identity`), `/requests/:id` conditional **Record decision** panel & limit warning
- **API:** Every route under `/api/cost-centers` and `/api/purchase-requests/**`

## Preconditions

- `bun run lab:doctor` confirms all 7 core identities (including `northstar-junior-approver`) exist and anonymous requests return `401 UNAUTHENTICATED`.

## How to Get to It (User POV)

1. Submit a `$7,000` (`700000` cents) request as **Northstar Requester**.
2. Switch to **Northstar Team Lead** (`northstar-junior-approver`, limit `$5,000.00`) and open the request.
3. Attempt to **Approve** and observe the actionable limit error (`403 APPROVAL_LIMIT_EXCEEDED`), confirming the request remains `PENDING` and budget stays untouched.

## Driving It with the Harness

```bash
bun run test:security
bun run test:unit
bun run test:integration
```

## Relevant Domain Rules & Related Invariants

- `INV-06` (Authorization): server-side membership & policy evaluation runs on every mutation and replay.

## Expected Observable Outcomes & Required Evidence

- Negative HTTP security tests prove `401` (unauthenticated), `403 FORBIDDEN` (wrong role, self-approval, revoked replay), and `403 APPROVAL_LIMIT_EXCEEDED` (over monetary cap) leave `purchase_requests`, `cost_centers`, `financial_commitments`, and `audit_events` completely unchanged.

## Gotchas & Known Limitations

- The UI hides unauthorized controls for usability, but authorization is **never** trusted to the UI; every security assertion calls HTTP endpoints directly.
- `POST /api/lab/session` is a synthetic lab identity selector that fails closed (`404`) when `WORKSHOP_LAB_MODE` is unset.
