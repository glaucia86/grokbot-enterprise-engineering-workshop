# Verify audit findings at runtime

Type: research
Status: resolved
Blocked by: 01

## Question

Which of findings F-01 to F-18, derived from source, hold in the rendered app, and which need correction?

## Context

Plan §C. Use the baseline captures; no new UI work. See [TRANSFORMATION-PLAN](../../../docs/experience/TRANSFORMATION-PLAN.md).

Blocked by: [Capture revision-bound UX baseline](01-capture-ux-baseline.md).

## Done when

Each finding is marked confirmed, refined or rejected, with a capture reference.

## Answer

Evidence:
- Baseline `ux-vs-00-6402d32` (solution, before UX-VS-00B).
- After-fix run `ux-vs-00b-67d5f4e` (solution).
- Manual starter rehearsal `artifacts/verification/starter/ux-vs-00b-starter-rehearsal/` (source `67d5f4e`, starter `bd9830d`, live PH-42 overspend).

| Finding | Verdict | Evidence |
| --- | --- | --- |
| F-01 aggregate "INV-02 holds" | Confirmed by source and by the failing unit test; **fixed in `67d5f4e`** | `tests/unit/dashboard-metrics.test.ts` red → green. The starter rehearsal shows "1 cost center over allocation" in red beside a $21,000.00 aggregate. The pre-fix overspend render was never captured, because the solution schema forbids overspend. |
| F-02 auditor "Ledger balanced" | Confirmed by source and test; **fixed** | The starter auditor dashboard shows "1 cost center over allocation" and a per-center reconciliation. |
| F-03 untrue claims | Confirmed (lock claim visible in baseline review captures); **fixed** for the decision form, landing chip, TLA+ copy and "real-time" copy | The hero tagline "Spend controls you can prove" remains for UX-VS-02. |
| F-04 UUIDs and residue titles | Confirmed | Baseline review header and dashboards |
| F-05 amount in cents | Confirmed | Requester journey: 7 interactions, including the cents entry |
| F-06 dropdown decision | Confirmed | Save enabled at projected −$850.00; refusal only after submit |
| F-07 limited approver | Confirmed | Warning, then a 403 alert. Save is below the fold at 1280×720. |
| F-08 lab switcher prominence | Confirmed visually | Orange "Switch identity" on every dashboard |
| F-09 IA / fold | Confirmed with metrics | Requester "Submit request" top at 978 px at 1440×900 |
| F-10 glossary drift | Partly fixed ("Available budget") | "Workspace" breadcrumb and "Review" remain (HD-22) |
| F-11 monospace figures | Confirmed visually | All dashboards |
| F-12 decorative motion | Not evaluable from screenshots (animations disabled) | Source only |
| F-13 / F-14 contrast and focusable tooltip | Source only | Ratios computed in plan §C |
| F-15 dark mode | Not evaluated | Light captures only |
| F-16 empty states | Not observed | Captured data had no empty lists |
| F-17 queue ignores available budget | Confirmed | "Within your limit" counts a $6,000.00 request against $5,150.00 available |
| F-18 no audit index | Confirmed by source | — |
| **F-19 (new)** | At 1280×720 the cost-center table overflows its card beneath the right rail, clipping the Available column | Baseline and starter auditor captures at 1280×720 |
| **F-20 (new)** | A controlled Decision select can lose input before hydration, so Save submits nothing | First harness attempt, `ux-vs-00-02a2226` trace (no decision POST) |
