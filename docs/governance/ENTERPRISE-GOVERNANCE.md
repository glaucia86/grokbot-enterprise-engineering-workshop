# Enterprise Delivery Governance & Control Separation

This document defines how Procurement Hub separates **repository-committed automation** from **administrative GitHub controls** and **human accountability**.

---

## 1. Committed Workflows vs. Administrative Branch Protection

Do **not** claim a governance control is enforced merely because a YAML file exists in `.github/workflows/`.

| Control | Where Configured | Enforceable Locally / In Repo? | Requires GitHub Admin Configuration? |
| --- | --- | --- | --- |
| Least-privilege CI tokens (`permissions: contents: read`) | `.github/workflows/workshop-verification.yml` | Yes (committed workflow) | Org policy can further restrict defaults |
| SHA-pinned third-party GitHub Actions | `.github/workflows/*.yml` | Yes (committed workflow) | Optional org allowlist |
| Independent CI execution across 6 split gates | `.github/workflows/workshop-verification.yml` | Commands runnable locally; remote CI runs on GitHub push/PR | **Yes** — require status checks on `main` via GitHub Rulesets |
| Protected file change detection (`governance-guard`) | `.github/workflows/workshop-verification.yml` & `engineering/loop-runner.ts` | Yes (loop runner blocks locally; CI flags PR summary) | **Yes** — pair with `CODEOWNERS` + required code-owner review |
| Prevent agent self-approval / self-merge | Repository & GitHub Rulesets | Documented policy in `AGENTS.md` | **Yes** — require >=1 human approval, dismiss stale reviews, block force-pushes & bypasses |
| Required linear/verified release publication | `engineering/package-workshop.ts` & GitHub Environments | Local bundle/branch checks verified | **Yes** — protected deployment environments for Pages / release tags |

---

## 2. Mandatory GitHub Ruleset Recommendations (For Target Enterprise Repository)

Configure these administrative settings in **Settings -> Rules -> Rulesets** targeting `main` (and `workshop/solution`):

1. **Require a pull request before merging** (`required_approving_review_count >= 1`, `dismiss_stale_reviews_on_push = true`, `require_code_owner_review = true`).
2. **Require status checks to pass before merging** (`strict_required_status_checks_policy = true`):
   - `Static checks and architecture boundaries`
   - `Unit, domain, harness and property-based tests`
   - `PostgreSQL integration, concurrency, security and migrations`
   - `Full runtime harness, Playwright E2E and evidence bundle`
   - `Bounded TLA+ and TLC model checking`
   - `Protected criteria and verifier change notice`
3. **Restrict force-pushes and branch deletion** (`non_fast_forward = block`, `deletion = block`).
4. **Scoped bot credentials:** Grant AI coding agents write access only to feature branches (`feat/*`, `fix/*`, `agent/*`), never administrative bypass or merge authority on `main`.

---

## 3. Phase 07 Independent Review Record (Clean Code, Quality & Security)

Conducted against Phase 06 candidate `6ba0bed6cae2e11118d8808ec49ad9ddaf0212e6` using `.agents/skills/clean-code/SKILL.md`, `.agents/skills/code-review-and-quality/SKILL.md`, and `docs/agents/AGENT-ROLES.md`:

| Axis | Finding | Severity | Resolution |
| --- | --- | --- | --- |
| **Clean Code** | `canDecidePurchase()` in `src/modules/procurement/domain/procurement.ts` had a redundant `amountMinor` parameter and dead `if (...) return true; return true;` branch. | Low | Simplified `canDecidePurchase(actor, requesterId, status)` to a single-expression pure boolean check; `canApproveAmount` owns monetary cap checks. |
| **Static Hygiene** | `artifacts/.cache/tla2tools-1.7.4.jar` had initially been tracked because `.gitignore` did not exclude `artifacts/.cache/` and `artifacts/loop/`. | Medium | Untracked binary JAR, added `artifacts/.cache/` and `artifacts/loop/` to `.gitignore`. |
| **Security (INV-06)** | Verified route + application layers reject non-`APPROVER` roles (`403 FORBIDDEN`) before touching `decision_idempotency_keys`, preventing key-probing by `REQUESTER` or `AUDITOR`. Confirmed `resolveIdempotentReplay` re-evaluates `evaluateApprovalAuthority` against live DB membership on every replay. | Verified Pass | No defect found; covered by `tests/security/isolation-and-auth.test.ts`. |
| **Security (Log Hygiene)** | Grep across `artifacts/verification/solution/phase06-solution-verified/` confirmed zero matches for `procurement_lab_session=`, `WORKSHOP_DB_PASSWORD`, or `postgresql://procurement:`. | Verified Pass | Confirmed clean. |
| **PostgreSQL Safety** | Confirmed deterministic deadlock-free lock order (`cost_centers FOR UPDATE` -> `purchase_requests FOR UPDATE`), ACID `RollbackDecision` preventing orphan keys on `409 INSUFFICIENT_BUDGET` / `409 INVALID_TRANSITION` / `500`, and safe legacy preflight checks in `0003_approval_integrity_constraints.sql`. | Verified Pass | Covered by `tests/concurrency/` and `tests/integration/approval-migration.test.ts`. |
| **Formal Correspondence** | Confirmed `skills/verify-formal-approval/SKILL.md` sync commit pinned to `6ba0bed6cae2e11118d8808ec49ad9ddaf0212e6` with real TLC artifacts (`defective-read-commit.cfg` exit 12, `locked-atomic.cfg` exit 0). | Verified Pass | Updated sync commit record. |
