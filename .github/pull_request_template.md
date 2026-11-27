## 1. Business Context

Link the incident or vertical slice (e.g., `PH-42`) and summarize the business risk addressed.

- **Issue / Slice:**
- **Impact:**

## 2. Root Cause

Explain the first place the system violated the invariant (observable evidence from reproduction, not guesses).

## 3. Proposed Solution

Describe the minimal targeted change across domain, application, persistence, and database layers.

## 4. Architectural Implications

- Modular Monolith layer impact (`domain`, `application`, `infrastructure`, `app`):
- Relevant ADRs (`docs/adr/`):
- `bun run verify:architecture` confirmed zero boundary regressions: `[ ] Yes`

## 5. Requirements & Business Invariants

Check every invariant preserved or restored by this candidate:

- [ ] `INV-01` Financial consistency (`committed <= allocated`, exact commitment sum)
- [ ] `INV-02` Non-negative available budget (`available >= 0`)
- [ ] `INV-03` Idempotent retries without duplicate commitments or transitions
- [ ] `INV-04` Payload/actor key conflict returns generic `409 IDEMPOTENCY_CONFLICT`
- [ ] `INV-05` Multi-tenant isolation (`404` on foreign access, independent keys)
- [ ] `INV-06` Authorization enforced on mutations and idempotent replay paths
- [ ] `INV-07` State machine integrity (`PENDING -> APPROVED | REJECTED` only)
- [ ] `INV-08` Audit consistency (exact 1:1 durable events, no duplicates)
- [ ] `INV-09` Transactional atomicity across status, budget, commitment, key, audit
- [ ] `INV-10` Recoverability on pre-commit failure and post-commit lost response

## 6. Verification Evidence

- **Candidate Git Commit SHA:** `<40-char HEAD SHA>`
- **Worktree Dirty:** `false`
- **Local Evidence Summary:** `artifacts/verification/solution/<run-id>/summary.md`
- **Independent CI Run URL:** `<link after push>`

| Check / Gate | Command | Status (`pass`/`fail`/`blocked`/`not-run`) | Key Observation / Artifact |
| --- | --- | --- | --- |
| Static & Architecture | `bun run check:static && bun run verify:architecture` | | |
| Unit & Domain | `bun run test:unit` | | |
| Integration & Migrations | `bun run test:integration` | | |
| Concurrency & PH-42 Live | `bun run test:concurrency && bun run ph42:reproduce` | | |
| Security Regressions | `bun run test:security` | | |
| Property-Based (`fast-check`) | `bun run test:properties` | | Seed: `4207` |
| Browser E2E (Playwright) | `bun run test:e2e` | | Screenshots/traces path: |
| Formal Model Checking (TLC) | `bun run verify:formal` | | Defective exit `12` / Locked exit `0` |
| Full Isolated Harness | `bun run verify:all --slice solution --run-id <id>` | | Cleanup passed & evidence retained |

## 7. Security Implications

- Cross-tenant isolation (`INV-05`) verified against real API endpoints: `[ ] Yes`
- Authorization on replay (`INV-06`) verified after role/limit change: `[ ] Yes`
- Sensitive data hygiene (zero session cookies, DB passwords, or raw secrets in logs/artifacts): `[ ] Yes`

## 8. Migration & Compatibility Considerations

- Tracked Drizzle migrations added/modified:
- Behavior on clean database:
- Behavior on dirty legacy data (overspent cost centers / duplicate commitments must fail safely without silent deletion):

## 9. Rollback or Forward-Recovery Strategy

- Safe rollback steps (or why forward-recovery is preferred if schema constraints were installed):
- Reconciliation plan for any pre-existing corrupted rows before re-running migrations:

## 10. Known Limitations & Unverified Claims

Explicitly list what was **not** run, bounded model assumptions, or environment constraints (e.g., remote CI pending push, production load testing out of scope).

## 11. Human Approval Checklist (Reviewer Only)

- [ ] Candidate SHA matches the exact revision verified in independent CI.
- [ ] Reviewed any `governance-guard` notice if acceptance criteria, ESLint rules, tests, or workflows changed.
- [ ] Confirmed before/after database counts, concurrency results, and security regressions independently.
- [ ] Confirmed agent did **not** self-approve, force-push, or merge this PR.
- [ ] Approved for merge by authorized human reviewer.
