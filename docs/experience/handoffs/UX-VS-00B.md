# Handoff — UX-VS-00B Truthful financial signals

| Field | Value |
| --- | --- |
| Objective | Make every integrity signal per cost center and remove claims that are untrue in any edition (TC-01 to TC-03, TC-05, TC-06; XR-16) |
| Status | pass |
| Branch and candidate SHA | `feat/ux-vs-00b-truthful-signals` @ `67d5f4e` (evidence), based on `feat/ux-vs-00-baseline` @ `a383cea`. This handoff is a docs-only follow-up commit. |
| Required human review | pending |
| Prerequisites | UX-VS-00 |
| Skills applied (path, SHA-256 prefix) | `.agents/skills/tdd/SKILL.md` `5505d25bbaa8` · `.agents/skills/clean-code/SKILL.md` `d00d449b92ca` · `.agents/skills/code-review-and-quality/SKILL.md` `bf8aed920c98` · `skills/verify-procurement/SKILL.md` `1d3e31ebca8a` |

## Requirements and acceptance evidence

| Requirement | Status | Observed result and evidence path |
| --- | --- | --- |
| TC-01 per-cost-center integrity (XR-16) | pass | `tests/unit/dashboard-metrics.test.ts`: 3 tests red (missing seam), then green. Covers the PH-42 aggregate case and offsetting reconciliation errors. |
| TC-02 no static success verdicts | pass | "INV-02 holds", "Ledger balanced" and "Every committed dollar traces to exactly one approved request" removed. The clear state is a computed, neutral statement. |
| TC-03 no edition-dependent protection claims | pass | Decision-form lock claim removed; network-failure copy now asks for a status check instead of promising a safe retry. Starter scan found none of the removed phrases. |
| TC-05 no "real-time" for page snapshots | pass | "Ledger balances … as of this page load" |
| TC-06 overspend visible to every role in business language | pass | Starter rehearsal: banner "Committed budget exceeds allocation · INV-01 · INV-02 … over its allocation by $4,000.00" for auditor, approver and requester at 1440×900 and 1280×720 (`artifacts/verification/starter/ux-vs-00b-starter-rehearsal/starter-rehearsal.json`) |
| AC-01–AC-12 unchanged | pass | `verify:all --run-id ux-vs-00b-67d5f4e`: pass, 14/14, `worktreeDirty: false`; browser 20/20 |
| PH-42 still reproducible in starter | pass | `bun run ph42:reproduce` exit 1: committed 1,400,000 of 1,000,000 (`ph42-reproduce.log`) |
| `.scratch/`, `.agents/` and `release/` excluded from editions | pass | Packaged `ux-vs-00b-rehearsal` bundles: 0 matching paths in starter, guided and solution |

## Changes and decisions

- `src/app/_components/dashboard-metrics.ts`:
  - Adds `integrity` (per-center allocated, committed, approved, over-allocation, reconciliation delta), `integrityStatus()` and `availabilitySignal()`.
  - Removes the aggregate `reconciliationDeltaMinor` and the unused `headroomAfterPendingMinor`.
- `src/app/_components/dashboard-panels.tsx`: the auditor next step and `LedgerReconciliation` use `integrityStatus()`, with a per-center table.
- `src/app/page.tsx`: "Available budget" KPI from `availabilitySignal()`; banner in business language with invariant IDs as technical detail; snapshot wording.
- `src/app/requests/[id]/decision-form.tsx`: lock claim removed; status-check copy on network failure.
- `src/app/_components/landing.tsx`: hero composition wrapped in a captioned `figure` ("Illustrative scenario, not live data"); the chip states the rule ("INV-01 · committed ≤ allocated") instead of a verdict; TLA+ scope stated accurately.

No API, domain, schema, test assertion, ESLint, CI or slice-check changes.

## Verification and review

| Check | Result |
| --- | --- |
| `bun run check:static` | exit 0 |
| `bun run verify:architecture` | exit 0 |
| `bun run test:unit` | 32/32 (3 new) |
| `bun run test:harness` | 6/6 |
| `verify:all --run-id ux-vs-00b-67d5f4e` (`WORKSHOP_UX_CAPTURE=1`) | pass, 14/14 checks, browser 20/20 (59.4 s) |
| Packaging `bun engineering/package-workshop.ts ux-vs-00b-rehearsal` | exit 0 |
| Starter rehearsal (isolated Compose project `ph-starter-00b` on `:55433`, app on `:3101`) | 6/6 captures meet expectations, 0 forbidden phrases; torn down afterwards |

**`clean-code` review:**
- Integrity rules live in one pure module and are tested.
- `integrityMessage` is shared by the next-step and reconciliation views.
- `plural` is local to the view-model.

**`code-review-and-quality` review:**
- Correctness: amounts stay integer minor units; `formatUsd(-available)` shows the positive overage.
- Security: no data beyond what each role already loads. Reconciliation is shown only to auditors, who see every tenant request.
- Accessibility: a reconciliation exception uses `role="alert"`; the table has a caption.

**Starter rehearsal limitation:** it is a manual run bound to `sourceSha` `67d5f4e` and starter commit `bd9830d`, not a `verify:all` harness run.

## Remaining work

- **F-19:** at 1280×720 the cost-center table overflows under the right rail (pre-existing; UX-VS-01/03).
- **F-20:** pre-hydration loss of the Decision select input (pre-existing; UX-VS-04).
- **Copy left for later:** "Spend controls you can prove" (UX-VS-02); "Workspace" breadcrumb and "Review" wording (HD-22).
- `docs/workshop/FACILITATOR-GUIDE.md` still describes the overspend as "-$4,000.00 (OVERSPENT) in red" in the table, which remains true. The new banner wording needs no guide change before UX-VS-07.

## Resume

Next: the **prototype phase** (ticket "Workspace variants A, B and C"), using the next-session prompt in `docs/experience/TRANSFORMATION-PLAN.md` §P.2. Preconditions met: HD-01/02/03/04/06 resolved and the baseline captured. Ticket "Information architecture and routing" is also on the frontier. The human verdict gates UX-VS-01.
