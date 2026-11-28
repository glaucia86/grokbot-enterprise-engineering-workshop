# Handoff — UX-VS-00 Baseline and experience contracts

| Field | Value |
| --- | --- |
| Objective | Revision-bound "before" baseline, decision map, pinned planning skills and experience contracts, with no UI change |
| Status | pass |
| Branch and candidate SHA | `feat/ux-vs-00-baseline` @ `6402d32` (evidence). This handoff is a docs-only follow-up commit. |
| Required human review | pending |
| Prerequisites | HD-01 (WIP stashed as `stash@{0}`), HD-02, HD-03, HD-04 and HD-06 resolved by the human on 2026-11-27 |
| Skills applied (path, SHA-256 prefix) | `.agents/skills/wayfinder/SKILL.md` `0c9fa96791ae` · `.agents/skills/prototype/SKILL.md` `714de632d116` · `.agents/skills/research/SKILL.md` `1f629e18ab89` · `.agents/skills/ui-taste/reference/operate.md` `c29983fb290a` · `.agents/skills/clean-code/SKILL.md` `d00d449b92ca` · `.agents/skills/code-review-and-quality/SKILL.md` `bf8aed920c98` · `skills/verify-procurement/SKILL.md` `1d3e31ebca8a` |

## Requirements and acceptance evidence

| Requirement or criterion | Status | Observed result and evidence path |
| --- | --- | --- |
| Clean-SHA baseline across roles, states and five viewports | pass | 52 captures, index `artifacts/verification/solution/ux-vs-00-6402d32/browser-results/experience-baseline-write-capture-index-experience/ux-baseline-index.json` |
| AC-01–AC-12 unchanged and passing | pass | `verify:all` run `ux-vs-00-6402d32`: 14/14 checks, all 5 stages pass, `worktreeDirty: false` |
| Skill integrity (28 pinned packages) | pass | `bun engineering/bootstrap-skills.ts --verify` exit 0 |
| Specification links | pass | `bun engineering/verify-specifications.ts`: 72 links, exit 0 |
| `.scratch/` excluded from every edition | not-run | Code change in `engineering/package-workshop.ts`; packaging rehearsal is scheduled for UX-VS-07 |

## Changes and decisions

| Commit | Change |
| --- | --- |
| `02a2226` | Lock entries for `wayfinder`, `prototype`, `grilling` and `research` (each pinned to its newest upstream commit at least 7 days old with bytes identical to `6f7f783`); `.agents/skills/.gitignore` and `docs/architecture/SKILL-INVENTORY.md` updated; `artifacts/ui-review/` ignored; `authoringOnly` exclusion (`release/`, `.agents/`, `.scratch/`) in `engineering/package-workshop.ts`; Wayfinder local tracker, map and 20 decision tickets; approved plan snapshot, draft `EXPERIENCE-SPEC.md` and `E2E-CONTRACT.md`; opt-in capture spec `tests/e2e/experience/baseline.spec.ts` |
| `6402d32` | Capture isolated: disposable cost center deleted after the run, and a Playwright `experience` project that depends on `journeys` |

**Flagged for human review:** `playwright.config.ts` is verifier configuration. The change only groups the existing specs into a `journeys` project and adds the dependent `experience` project. No existing assertion, timeout or selector changed.

**Removed on the human's instruction:** `package-lock.json`, `.agents/skills/ui-ux-pro-max/scripts/__pycache__/`, the CLI-installed `.agents/skills/{wayfinder,prototype}` and the root `skills-lock.json`.

## Verification and review

| Check | Result |
| --- | --- |
| `bun run check:static` | exit 0 |
| `bun run verify:architecture` | exit 0 |
| `bun run test:unit` | 29/29 |
| `bun run test:harness` | 6/6 |
| Attempt 1: `verify:all --run-id ux-vs-00-02a2226` | **fail.** `security-regressions` (INV-06 senior approval got 409 because the capture had spent `CC-OPS-01`) and `browser` (`procurement-budget.spec.ts` never sent its decision POST while the capture loaded the browser in parallel). New hypothesis: isolate the data and the scheduling. |
| Attempt 2: `verify:all --run-id ux-vs-00-6402d32` | **pass**, 14/14 checks, browser 20/20 (57.9 s of the 90 s budget) |

**`clean-code` review:**
- The capture spec keeps one responsibility per helper (`watch`, `capture`, `submit`, `decide`).
- Constants are named; there are no magic budget numbers beyond the documented fixture amounts.

**`code-review-and-quality` review:**
- The capture never mutates seeded data, and its cleanup runs in `afterAll`.
- No secrets are logged; the database URL comes from `labConnectionString()`.
- One residual risk is noted below.

## Remaining work

- **Latent flake, not fixed in this slice** (it is UI behaviour owned by UX-VS-04). A pre-hydration race on the controlled Decision select can make `procurement-budget.spec.ts` click Save with no POST. It is recorded in ticket "Decision state machine and failure contract".
- **Browser budget:** the browser check now uses about 58 of its 90 s timeout when the capture is enabled. Without `WORKSHOP_UX_CAPTURE` the capture is skipped and the journeys run as before.
- **F-01 and F-02** are not observable on the solution schema; they need a starter-edition rehearsal (UX-VS-00B / UX-VS-07).

## Resume

Next: **UX-VS-00B Truthful financial signals** (direction-independent). Read `docs/experience/EXPERIENCE-SPEC.md` §3 (TC-01–TC-07), plan findings F-01–F-03 in `docs/experience/TRANSFORMATION-PLAN.md`, `src/app/_components/dashboard-metrics.ts`, `src/app/_components/dashboard-panels.tsx`, `src/app/page.tsx`, `src/app/requests/[id]/decision-form.tsx` and `src/app/_components/landing.tsx`. Then the prototype phase per plan §P.2.
