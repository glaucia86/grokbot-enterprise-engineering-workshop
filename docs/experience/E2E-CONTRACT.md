# E2E and Feature-Map UI Contract

Browser tests (`tests/e2e/`) and the verify-procurement feature maps (`skills/verify-procurement/features/`) rely on the UI contracts below. A UX slice may change a contract only when:

1. the change is listed here with its slice and status,
2. the replacement assertion is equal or stronger (same business outcome, same persisted-state evidence), and
3. a human approves it in PR review (HD-17).

Assertions are never removed to make a run pass. Server-side guarantees remain covered by the integration, concurrency and security suites, which UX slices do not edit.

## Current contracts (baseline `b7b0343`)

| Contract | Used by | Status |
| --- | --- | --- |
| `goto("/")` lands on the landing page when anonymous and on the dashboard with a session | all specs | unchanged |
| Label `Lab identity` + button `Switch identity` | all specs, feature maps | unchanged |
| `.session-state` contains `<Tenant> · <Display name> · <ROLE>` | `decision.spec.ts`, `procurement-budget.spec.ts` | unchanged |
| Text `<Tenant> · <Display name> · <ROLE>` visible on the dashboard | `procurement.spec.ts` | unchanged |
| Headings `My requests` (requester) and `Tenant requests` (approver, auditor) | `procurement.spec.ts` | unchanged |
| Labels `Title`, `Justification`, `Amount (USD cents)`, exact `Cost center`; button `Submit request` | specs, `purchase-request-creation.md` | unchanged |
| Text `= $6,000.00 USD` amount preview | `procurement-budget.spec.ts` | unchanged |
| Link `Back to purchase requests` | all detail journeys | unchanged |
| Region `Record decision`; `getByLabel("Decision").selectOption`; button `Save decision`; label `Rejection reason` | `decision.spec.ts`, `procurement-budget.spec.ts`, `purchase-request-approval.md` | unchanged |
| `getByRole("article").getByRole("status")` holds the request status text | decision journeys | unchanged |
| Region `Audit trail` with one list item per Audit Event | `decision.spec.ts`, `procurement.spec.ts`, `audit-trail.md` | unchanged |
| Heading `Financial commitment` after approval | `procurement-budget.spec.ts` | unchanged |
| `tr[data-cost-center-code="CC-ENG-01"]` on the page reached by `Back to purchase requests` | `procurement-budget.spec.ts` | unchanged |
| Navigation `Filter requests by status`, link `Approved`, URL ends `?status=APPROVED` | `procurement-budget.spec.ts` | unchanged |
| Text `exceeds your approval limit` (pre-check) and alert `exceeds your organizational approval limit` (server refusal) | `procurement-budget.spec.ts` | unchanged |
| Link `Check lab readiness` triggers `GET /api/health` → `{"status":"ready"}` | `scaffold.spec.ts` | unchanged |
| Foreign request detail returns HTTP 404 without the title | `procurement.spec.ts` | unchanged |
| No horizontal overflow > 1 px at 390×844 | `procurement-budget.spec.ts` | unchanged |

## Planned changes (proposed, pending approval)

| Contract | Proposed replacement | Slice | Parity requirement |
| --- | --- | --- | --- |
| `goto("/")` dashboard | `/` redirects to `/dashboard` (session) or `/home` (anonymous) | UX-VS-01 | Same journeys reach the same surfaces; redirect asserted explicitly |
| `Check lab readiness` link to raw JSON | Readiness rendered on `/lab` from the same `GET /api/health` call | UX-VS-01/02 | Still asserts HTTP 200 and `{"status":"ready"}` |
| `Decision` select + `Save decision` | Buttons `Approve $<amount>` and `Reject request`, confirmation dialog | UX-VS-04 | Same status, region disappearance, audit count, actor and reason assertions; plus API-backed commitment check |
| Over-limit refusal after Save | Approve unavailable with explanation (HD-11) | UX-VS-04 | Browser asserts the explanation **and** a same-session `page.request` decision call returns 403 `APPROVAL_LIMIT_EXCEEDED` with state unchanged |
| `Amount (USD cents)` | `Amount (USD)` with exact string-to-minor-unit parsing | UX-VS-05 | Same persisted `amountMinor`; `$12.50` and `$6,000.00` assertions kept |
| `tr[data-cost-center-code]` after Back | Cost-center rows on `/dashboard` and `/budgets` | UX-VS-03 | Same `data-cost-center-code` attribute and amounts |

## Observational capture

`tests/e2e/experience/baseline.spec.ts` captures screenshots and metrics only when `WORKSHOP_UX_CAPTURE=1`. It never replaces an AC-09 assertion. It runs in the `experience` Playwright project, which depends on the `journeys` project, so it starts only after the AC-09 specs finish. All its data lives in a disposable cost center that is deleted afterwards, so it never spends the seeded budgets that the journeys and the security suite rely on.
