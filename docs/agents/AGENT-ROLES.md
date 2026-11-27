# Specialized Agent Collaboration & Independent Review Protocol

This document defines the six specialized engineering responsibilities for enterprise delivery in Procurement Hub.

> **Honest Capability Disclosure**  
> Where an agent platform (such as GrokBot in an enterprise deployment) supports genuine independent sub-agents with isolated contexts and scoped tool permissions, assign each role to a separate agent instance. Where the platform does **not** natively support multi-agent orchestration (or during single-session local execution), execute these roles **sequentially in fresh context windows**, passing only persisted repository artifacts (`artifacts/loop/<run-id>/handoff.md`, `artifacts/verification/<run-id>/summary.md`, and the exact Git commit SHA). Never present simulated single-prompt roleplay as genuine independent multi-agent verification.

---

## 1. Role Charters & Boundaries

| Role | Primary Ownership | Permitted Actions | Explicitly Forbidden |
| --- | --- | --- | --- |
| **1. Engineering Lead** | Requirements (`PRD.md`), architecture (`SPEC.md`, ADRs), Smart/Dumb Zone vertical slicing, handoff briefs | Scope tickets, approve architectural trade-offs, verify acceptance criteria alignment | Bypassing quality gates or weakening invariants |
| **2. TypeScript Engineering Agent** | Root-cause investigation, domain modeling, migrations, minimal targeted fix, unit/integration tests | Edit scoped `src/`, `drizzle/`, and slice tests on a feature branch; run local harness checks | Editing CI workflows, weakening existing tests/ESLint boundaries, self-approving PRs |
| **3. Quality Engineering Agent** | Independent verification & **adversarial falsification** of implementation claims | Execute `verify:all`, `ph42:reproduce`, concurrency bursts, `fast-check` fuzzing, Playwright E2E, and inspect raw PostgreSQL state | Trusting the implementer's narrative without re-executing against the exact commit SHA |
| **4. Security Engineering Agent** | Tenant isolation (`INV-05`), authorization (`INV-06`, incl. replay), idempotency abuse (`INV-04`), secret/PII hygiene | Execute `test:security`, review SQL queries/session resolution/error responses, inspect logs for cookie/credential leaks | Accepting UI-only hiding as authorization |
| **5. Platform Engineering Agent** | Independent CI/CD gates, evidence provenance, clean-checkout packaging, release governance | Validate GitHub Actions workflows, `ci-evidence.ts` SHA integrity, `governance-guard`, and clean starter/solution clones | Merging PRs without human approval or ignoring `worktreeDirty: true` |
| **6. Human Reviewer** | Final business, architectural, and risk judgment | Inspect PR template, diff, CI evidence artifact, limitations, and approve or reject merge | Delegating final merge accountability to an autonomous agent |

---

## 2. Independent Falsification Checklists

### Quality Engineering Agent — Falsification Checklist
Do not merely confirm the happy path; actively try to break the candidate:
- [ ] Run `bun run ph42:reproduce` — does `CC-ENG-01` keep `committedBudgetMinor <= allocatedBudgetMinor` and `availableBudgetMinor >= 0`?
- [ ] Run `bun run test:concurrency` — under a 6-way concurrent burst of `$3,000` approvals against `$10,000`, do at most 3 succeed (`$9,000 <= $10,000`) with zero `500` errors?
- [ ] Run two simultaneous identical approvals with the **same** `Idempotency-Key` — do both converge cleanly (`200`) with exact `1` commitment and `1` `APPROVED` audit event?
- [ ] Trigger a forced pre-commit DB error (audit insert rejection) — do `purchase_requests.status`, `cost_centers.committed_budget_minor`, `financial_commitments`, and `decision_idempotency_keys` all roll back cleanly?
- [ ] Run `bun run test:properties` — record exact `fast-check` seed and case counts.
- [ ] Run `bun run test:e2e` — confirm real Chromium user journeys succeed and screenshots/traces are captured.
- [ ] Run `bun run verify:formal` — confirm TLC finds counterexample on defective config (`exit 12`) and exhaustively passes on locked config (`exit 0`).

### Security Engineering Agent — Falsification Checklist
- [ ] Cross-tenant isolation (`INV-05`): Can `meridian-approver` read, approve, or audit a Northstar request? Must return `404 NOT_FOUND` with zero details.
- [ ] Cross-tenant Cost Center injection (`INV-05`): Can `meridian-requester` submit a request against Northstar `CC-ENG-01`? Must return `404 NOT_FOUND`.
- [ ] Client authority spoofing: Does supplying `tenantId`, `requesterId`, `actorId`, or `role` in JSON body fail with `400 INVALID_INPUT`?
- [ ] Separation of duties (`INV-06`): If a requester is promoted to `APPROVER`, can they approve their own prior request? Must return `403 FORBIDDEN`.
- [ ] Approval limit enforcement (`INV-06`): Can `northstar-junior-approver` (limit `$5,000`) approve a `$7,000` request? Must return `403 APPROVAL_LIMIT_EXCEEDED`.
- [ ] **Authorization on replay (`INV-06`):** If an approver is downgraded to `AUDITOR` (or limit lowered) after approving with key `K`, does replaying key `K` return `403` instead of leaking the cached `200`?
- [ ] Idempotency oracle prevention (`INV-04`): Does reusing another actor's key in the same tenant return generic `{"error":{"code":"IDEMPOTENCY_CONFLICT"}}` with zero request ID, amount, or actor leakage?
- [ ] Evidence & log hygiene: Confirm `artifacts/verification/<run-id>/` contains zero session cookies (`procurement_lab_session=`), database passwords, or stack traces.

---

## 3. Sequential Fresh-Context Handoff Protocol

When running roles sequentially across fresh context windows:
1. Each role starts cold with **only** the persisted handoff pointer (`artifacts/loop/<run-id>/handoff.md`), candidate commit SHA (`git rev-parse HEAD`), and its role charter above.
2. Each role writes its independent findings (command, exit code, observed evidence, severity, verdict) into the handoff / review section.
3. Any `HIGH` or `CRITICAL` finding from QA or Security returns execution to the TypeScript Engineering Agent within the bounded self-correction budget, followed by full re-verification of the new commit SHA.
