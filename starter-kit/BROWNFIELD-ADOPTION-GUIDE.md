# Brownfield Incremental Adoption Guide

Do **not** attempt a big-bang rewrite to make a brownfield enterprise codebase safe for AI coding agents. Adopt the Trust Pyramid **bottom-up, one high-risk invariant at a time**.

---

## Stage 1 (Week 1) — Pick One Costly Invariant & Encode Structural Guardrails

1. Pick **one** high-impact invariant from recent production incidents (e.g., double billing, negative inventory/budget, cross-tenant leakage, duplicate webhook side effects).
2. Add **one** executable architectural rule (`eslint.config.ts` or dependency-cruiser) that rejects the single worst boundary violation agents keep repeating — plus a negative test proving the rule fails when violated.
3. Add a concise `AGENTS.md` using `02-AGENTS.template.md` that **routes** to existing specs/commands instead of repeating 500 lines of prose instructions.

**Exit check:** Every PR runs static typechecking + your first architectural boundary rule in <30 seconds.

---

## Stage 2 (Week 2) — Build a Reusable Verification Skill & 3–5 Feature Maps

1. Create `skills/verify-<app>/SKILL.md` from `04-verification-skill.template.md` defining exact **Launch, Doctor, Drive, Evidence, and Cleanup** commands against a disposable local database/sandbox.
2. Seed 3–5 Feature Maps (`03-feature-map.template.md`) for your highest-value user journeys.
3. Prove the skill end-to-end once and verify evidence survives cleanup.

**Exit check:** Any engineer or agent can launch the real app, verify the target feature against real persisted state, and tear down cleanly with one command.

---

## Stage 3 (Week 3) — Add Bounded Loop Engineering, Concurrency & Property Tests

1. Add a deterministic reproduction harness for your target concurrency/state failure mode.
2. Introduce `fast-check` property-based tests (with pinned seed logging) over domain state transitions and monetary/idempotency rules.
3. Enforce bounded iteration budgets (initial run + at most 2 self-corrections) and anti-spin hypothesis tracking (`07-loop-engineering-playbook.md`, `08-handoff.template.md`).
4. For your single most dangerous concurrency/retry protocol, author a 60-line TLA+ model (`06-formal-verification.template.tla`) showing both a broken counterexample and a passing bounded model.

**Exit check:** Agents iterate against deterministic runtime/database feedback rather than guessing from unit mocks.

---

## Stage 4 (Week 4) — Independent CI Quality Gates & Evidence-First PR Governance

1. Split CI into least-privilege independent gates (`10-independent-quality-gates.workflow.yml`) pinned to exact commit SHAs, including a `governance-guard` that alerts reviewers when PRs edit tests, ESLint boundaries, or workflows.
2. Adopt the 11-section evidence-first PR template (`11-pull-request.template.md`).
3. Configure administrative GitHub Branch Rulesets (`12-enterprise-governance-checklist.md`) so agents **never** self-approve, force-push, or merge to `main`.

**Rule of Thumb (Lauren Tan's Codebase Gardening Principle):** Every time a human reviewer corrects an agent twice for the same mistake, stop adding prose to `AGENTS.md` — turn the correction into a type, a lint rule, a database `CHECK` constraint, or a regression test.
