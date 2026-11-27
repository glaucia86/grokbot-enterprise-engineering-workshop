# Definition of Done (DoD)

A vertical slice, pull request, or workshop release candidate is **NOT DONE** until every applicable criterion below is satisfied with real, executed, revision-bound evidence.

## 1. Code & Architecture Integrity
- [ ] Domain types and invariants (`INV-01`–`INV-10`) are modeled explicitly in `src/modules/procurement/domain/` with zero framework or database imports.
- [ ] `bun run check:static` (ESLint + `tsc --noEmit` strict mode) exits `0`.
- [ ] `bun run verify:architecture` confirms negative boundary violations are rejected by ESLint across `domain`, `application`, `infrastructure`, and UI layers.
- [ ] No floating-point arithmetic is used for financial values or budget invariants.
- [ ] `clean-code` and `code-review-and-quality` checklists have been applied and significant findings resolved.

## 2. Deterministic & Runtime Verification
- [ ] For any bug fix (such as PH-42), a deterministic test or reproduction script failed **before** the fix and passed **after** the fix without weakening assertions.
- [ ] `bun run test:unit`, `bun run test:integration`, `bun run test:concurrency`, `bun run test:security`, `bun run test:properties`, and `bun run test:harness` all execute and pass against real PostgreSQL 18.
- [ ] `bun run test:e2e` executes against the live built Next.js application in Playwright Chromium with zero failures.
- [ ] `bun run verify:all --run-id <id>` completes all 5 stages (`launch`, `doctor`, `drive`, `evidence`, `cleanup`) on a clean Git worktree, and both `manifest.json` and `summary.md` survive teardown.

## 3. Formal Verification (When Critical Concurrency/State Protocol Changes)
- [ ] `bun run verify:formal` executes real TLC against `formal/ProcurementApproval.tla`:
  - `defective-read-commit.cfg` exits `12` with a counterexample trace violating `BudgetNotExceeded`.
  - `locked-atomic.cfg` exits `0` with `0` states left on queue.
- [ ] Sync commit SHA in `skills/verify-formal-approval/SKILL.md` matches the reviewed code revision and explicit bounds/limitations are documented.

## 4. Evidence Integrity & Governance
- [ ] Every reported check clearly distinguishes `pass`, `fail`, `blocked`, and `not-run`.
- [ ] Evidence is bound to the exact candidate Git commit SHA (`worktreeDirty: false`). Any post-verification edit invalidates prior evidence and triggers re-verification.
- [ ] No secrets, session cookies, credentials, or raw connection strings exist in commits, logs, or evidence bundles.
- [ ] Any edit to acceptance criteria, verifier config, ESLint boundaries, or CI workflows is explicitly flagged for human review.
- [ ] Pull Request uses `.github/pull_request_template.md`; final approval and merge belong exclusively to a human reviewer.

## 5. Workshop Release Readiness (Additional Criteria for Workshop Editions)
- [ ] `workshop/starter` runs cleanly from an isolated checkout, passes baseline checks, deterministically reproduces PH-42 (`$14,000 > $10,000`, exit `1`), and contains zero solution ADRs/patches.
- [ ] `workshop/guided` provides progressive hints and checkpoints without revealing the complete solution.
- [ ] `workshop/solution` passes every deterministic, runtime, formal, and packaging check from a clean checkout.
- [ ] `docs/workshop/PARTICIPANT-GUIDE.md`, `docs/workshop/FACILITATOR-GUIDE.md`, `starter-kit/`, and `slides/` accurately reflect verified repository capabilities (`bun run slides:verify` passes).
