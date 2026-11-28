# PH-UXS-001 — Procurement Hub Experience Specification (Draft)

**Status:** Draft 0.1, not accepted. Sections marked *pending* wait on decision tickets in `.scratch/ux-transformation/map.md`.
**Authority:** [`PRD.md`](../../PRD.md) and [`SPEC.md`](../../SPEC.md) remain authoritative. This document supplements them and never weakens an invariant (`INV-01`–`INV-10`) or acceptance criterion (`AC-01`–`AC-12`).
**Sources:** [Approved transformation plan](TRANSFORMATION-PLAN.md) · [E2E contract](E2E-CONTRACT.md) · [Glossary](../domain/GLOSSARY.md)

---

## 1. Scope

This document covers the product experience of Procurement Hub: navigation, interaction, visual system, accessibility, motion and verification. Financial authority stays in the domain and server-side services. The interface is a Dumb Zone: it presents authoritative state and never decides policy.

## 2. Personas and jobs (supported roles only)

| Persona | Lab identity | Primary job | Must never |
| --- | --- | --- | --- |
| Requester | `northstar-requester`, `meridian-requester` | Raise a purchase request against the right cost center and track it to a decision | See other requesters' requests or any audit trail |
| Approver | `northstar-approver`, `northstar-approver-2`, `meridian-approver` | Find pending work, understand the financial impact, and record an Approval Decision | Approve their own request or exceed their Approval Limit |
| Limited approver | `northstar-junior-approver` ($5,000.00) | Decide within authority and recognise when a higher limit is needed | Be led to believe an over-limit approval can succeed |
| Auditor | `northstar-auditor`, `meridian-auditor` | Trace terminal outcomes, Financial Commitments and Audit Events | Change state |
| Workshop participant / instructor | any, via the lab | Reproduce PH-42 and compare unsafe and verified behaviour | Mistake the synthetic identity switch for production sign-in |

## 3. Truthfulness contract (applies from UX-VS-00B)

| ID | Rule |
| --- | --- |
| TC-01 | Integrity status is computed **per cost center** from authoritative data at render time. It is never aggregated across cost centers, because an aggregate can hide a single overspent center. |
| TC-02 | The interface states facts (allocated, committed, available, difference) and surfaces violations prominently. It never shows a static "holds", "verified" or "balanced" success badge for an invariant. |
| TC-03 | Claims about protections (row locking, idempotency, atomicity, model checking) appear only where they are true for **every edition that ships the UI**, including `workshop/starter`, or they move to a qualified lab disclosure. |
| TC-04 | Illustrative figures are labelled as illustrative and never mixed with live tenant data. |
| TC-05 | "Real-time" and "live" describe only continuously refreshed data. Server-rendered figures are snapshots of the moment the page loaded. |
| TC-06 | An overspent cost center (`committed > allocated`) is visible to every role in business language, with the invariant identifiers available as technical detail. |
| TC-07 | A financial decision is shown as successful only after the authoritative server response confirms it. No optimistic commits. |

## 4. Experience requirements

| XR | Requirement (observable) | Slice |
| --- | --- | --- |
| XR-01 | Approver sees the pending count and primary action without scrolling at 1440×900 and 1280×720 | UX-VS-03 |
| XR-02 | Review reachable in one interaction from the queue | UX-VS-03/04 |
| XR-03 | Before confirming: available budget, request amount, projected available budget and Approval Limit are shown and equal server data | UX-VS-04 |
| XR-04 | Success shown only after a 200 response with persisted state | UX-VS-04 |
| XR-05 | Rejection requires a reason | UX-VS-04 |
| XR-06 | Insufficient budget: clear conflict message, refreshed context, request stays pending | UX-VS-04 |
| XR-07 | Unknown outcome is reconciled before a safe retry with the same Idempotency Key; no double commitment | UX-VS-04 |
| XR-08 | Over-limit approval is unavailable with a reason; the server still refuses with 403 | UX-VS-04 |
| XR-09 | Requester sees only their own requests and their status; no audit trail | UX-VS-05 |
| XR-10 | Tenant audit feed for approvers and auditors; requesters denied; tenants isolated | UX-VS-06 |
| XR-11 | Legacy routes redirect with query parameters preserved; deep links and back navigation work | UX-VS-01 |
| XR-12 | Keyboard-only approval and rejection with visible focus; dialogs trap and return focus | UX-VS-04 |
| XR-13 | Reduced motion: no running animations; all content visible | UX-VS-02/07 |
| XR-14 | No full-page horizontal overflow at 390 and 320 CSS px | all |
| XR-15 | No console errors or failed requests on core journeys | all |
| XR-16 | Integrity signals computed per cost center; no static success claims (TC-01, TC-02) | UX-VS-00B |
| XR-17 | Cross-tenant detail returns 404 with no title leak | all |
| XR-18 | Design-token contrast thresholds hold (text 4.5:1, graphics 3:1) | UX-VS-01 |
| XR-19 | Home understandable without motion; illustrative data labelled; LCP and CLS budgets met | UX-VS-02 |
| XR-20 | Lab identity presented as a simulation, never as sign-in | UX-VS-01 |

## 5. Acceptance scenarios (seeds)

```gherkin
@XAC-14 @INV-01 @INV-02
Scenario: An overspent cost center is never reported as healthy
  Given cost center "CC-ENG-01" has committed $14,000.00 against $10,000.00 allocated
  And cost center "CC-OPS-01" has committed $0.00 against $25,000.00 allocated
  When any Northstar identity opens the dashboard
  Then "CC-ENG-01" is reported as overcommitted by $4,000.00
  And no element states that available budget is healthy or that the ledger is balanced

@XAC-15 @INV-01
Scenario: The auditor sees both integrity clauses per cost center
  Given every committed dollar matches an approved request
  And "CC-ENG-01" committed exceeds allocated
  When the auditor opens the dashboard
  Then "CC-ENG-01" is shown as reconciled to approved requests but over its allocation
```

Further scenarios (XAC-01 to XAC-13) are seeded in the approved plan §M and will be refined by the decision tickets.

## 6. Baseline (UX-VS-00)

Evidence: `artifacts/verification/<run-id>/browser-results/**/ux-baseline-index.json`, produced by [`tests/e2e/experience/baseline.spec.ts`](../../tests/e2e/experience/baseline.spec.ts) with `WORKSHOP_UX_CAPTURE=1`. Measured values are recorded in the UX-VS-00 handoff and in ticket "Capture revision-bound UX baseline". Improvement claims must cite this baseline.

## 7. Pending sections

Navigation contract, design system, interaction contracts, motion, responsive behaviour and performance budgets are *pending* tickets 04–20 of the decision map. The [approved plan](TRANSFORMATION-PLAN.md) §D–§K hold the current proposals.

## 8. Delivery log

| Slice | Requirements delivered | Evidence |
| --- | --- | --- |
| UX-VS-00 | Baseline captured (no UI change) | `verify:all` `ux-vs-00-6402d32`, [handoff](handoffs/UX-VS-00.md) |
| UX-VS-00B | XR-16; TC-01, TC-02, TC-03, TC-05, TC-06 | `verify:all` `ux-vs-00b-67d5f4e` and a starter rehearsal, [handoff](handoffs/UX-VS-00B.md) |
