# Capture revision-bound UX baseline

Type: task
Status: resolved
Blocked by: none

## Question

What does the current experience actually look like and measure, per role, state and viewport, on a clean commit?

## Context

Plan §L UX-VS-00, §M (XR baselines). Capture spec `tests/e2e/experience/baseline.spec.ts` (gated by `WORKSHOP_UX_CAPTURE=1`). See [TRANSFORMATION-PLAN](../../../docs/experience/TRANSFORMATION-PLAN.md).

## Done when

A `verify:all` evidence bundle bound to a clean SHA holds screenshots, console/network/overflow observations and fold/click metrics for every role, state and viewport.

## Answer

Captured on clean SHA `6402d32` with `WORKSHOP_UX_CAPTURE=1 bun run verify:all --run-id ux-vs-00-6402d32`. Harness status `pass`, `worktreeDirty: false`, 14/14 checks pass. Evidence: `artifacts/verification/solution/ux-vs-00-6402d32/` (`manifest.json` SHA-256 prefix `b94d7d9e68823b6b`); index at `browser-results/experience-baseline-write-capture-index-experience/ux-baseline-index.json`.

- **Coverage:** 52 screenshots. Landing, four role dashboards and five review/detail states across 1920×1080, 1440×900, 1280×720, 768×1024 and 390×844, plus two server-refusal states at 1440×900.
- **Primary action below the fold** (11 captures): requester "Submit request" at 1440×900, 1280×720, 768×1024 and 390×844 (top 978 px at desktop); approver "Save decision" at 768×1024 and 390×844; junior approver "Save decision" at 1280×720, 768×1024 and 390×844. The approver's and auditor's dashboard actions are above the fold everywhere.
- **Reflow:** no horizontal overflow at 320 CSS px on any captured surface.
- **Interactions:** requester submit from landing = 7 (including amount typed in cents); approver approve from landing = 5 (including a select for the decision).
- **Console and network:** only the expected 403 `APPROVAL_LIMIT_EXCEEDED` and 409 `INSUFFICIENT_BUDGET` refusals.
- **Observed for ticket "Verify audit findings at runtime":**
  - The lock claim is shown to approvers (F-03).
  - The review header shows the raw UUID (F-04).
  - The decision is a select plus Save; Save stays enabled when the projected budget is −$850.00 (F-06).
  - The decision queue counts a $6,000.00 request as "within your limit" while its cost center has $5,150.00 available (F-17).
  - Dashboards are dominated by E2E residue titles (F-04).
- **Not observable here:**
  - F-01 and F-02 (the overspend state is impossible on the solution schema); they need a starter-edition rehearsal.
  - Motion (screenshots disable animations).
- **Harness interaction fixed:** the first attempt (`ux-vs-00-02a2226`, fail) spent seeded budget used by the security suite and loaded the browser in parallel with the journeys. Fixed in `6402d32` with a disposable cost center and a Playwright project dependency.
- **Latent flake:** `procurement-budget.spec.ts` once never sent its decision POST, consistent with a pre-hydration race on the controlled Decision select. It is an input to ticket "Decision state machine and failure contract".
