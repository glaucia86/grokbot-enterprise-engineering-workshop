# Vertical slices, checkpoints and release plan

**ID:** PH-PLAN-001 | **Version:** 0.1 | **Status:** proposed

## 1. Execution sequence

Each slice should end in an observable check before work proceeds. Work in small commits; the instructor reference implementation is separate from the intentionally faulty starter.

| Slice | Vertical outcome | Exit evidence / dependency |
| --- | --- | --- |
| VS-00 — Scaffold + capability spike | App starts with pinned dependencies, disposable PostgreSQL, and a working agent execution path or explicit fallback | Clean checkout smoke test; verify GrokBot terminal, repo access, browser, DB networking and artifact retrieval. Record blockers. |
| VS-01 — Tenant-scoped procurement | Seeded role sessions; requester submits and views own requests; scoped list/read, basic audit | Real HTTP + UI smoke, tenant/role negative tests (VS-00) |
| VS-02 — Decisions + baseline integrity | Approver makes one valid decision, audit history, transaction rollback and state constraints; ordinary replay works | Integration tests and browser journey (VS-01) |
| VS-03 — Reproducible brownfield defect | Intentionally vulnerable concurrent retry path; participant issue and failing regression | Repeatable red check and recorded ordinary baseline checks; no fabricated evidence (VS-02) |
| VS-04 — Verification harness | Doctor, feature map, repeatable runtime driver, artifact manifest, cleanup | Demonstrate harness on starter with known fail, preserve artifacts after teardown (VS-03) |
| VS-05 — Reference fix | Scoped migration and atomic conflict handling; same public behavior and all P0 criteria verified | Red-to-green evidence, clean candidate commit, V-01–05, migration clean/dirty cases (VS-04) |
| VS-06 — CI and repository packaging | Independent CI, scoped permissions, PR template, starter/solution branches and docs | CI rerun on reference SHA; clean clone of each branch and verified docs (VS-05) |
| VS-07 — Optional formal extension | Property tests and prepared defective/corrected models | Reproducible seeds and checked model output; optional, never blocks P0 (VS-05) |

VS-00 is the immediate next implementation task; do not start building every module before the scaffold works. The full workshop rehearsal is a later phase, after project, slides and talk track are ready.

## 2. Repository and branch strategy

The authoring repository `grokbot-enterprise-engineering-workshop` is initially private, with the specification pack in `doc-specs/`. Prepare a public workshop release only after review. The initial specification commit contains instructor-facing information; do not derive the participant starter from that history if the reference solution must remain hidden. Prepare a clean participant-facing history or separate release repository. Never commit secrets.

| Ref | Meaning |
| --- | --- |
| `main` | Workshop entry point and learner documentation; links to lab branches |
| `workshop/starter` | Executable faulty baseline, issue spec, verification harness and ordinary tests; no instructor solution ADR or solution code in this branch |
| `workshop/solution` | Verified reference code, complete checks, sanitized evidence links, instructor design ADR if intended for public release |
| `checkpoint-01` | Starter defect reproduced |
| `checkpoint-02` | Starter plus validated verification harness |
| `checkpoint-03` | Candidate correction |
| `checkpoint-04` | Independently verified solution |
| `v1.0.0` | Stable workshop release pointing to the documentation entry point and linking the lab refs |

Tags must identify actual immutable commits and only be created after the indicated state is verified. A public solution branch is intentionally visible; branch separation reduces accidental spoilers, not access. Keep candidate PRs on scratch branches from starter; target a separate delivery branch when demoing required invariant checks. A public repo must not include private rehearsal notes, tokens, participant data or credentials. Choose public release timing with the organizer.

## 3. Live workshop run of show (60 min)

| Time | Segment |
| --- | --- |
| 00–05 | Business case and observable defect |
| 05–12 | Enforceable architecture and trust pyramid |
| 12–20 | Verification harness, skills and feature maps |
| 20–40 | Live GrokBot loop: reproduce → diagnose → fix → verify |
| 40–48 | Candidate evidence, independent CI and review |
| 48–53 | Optional prepared model checking; if unavailable, deeper runtime evidence |
| 53–60 | Q&A |

Prepare checkpoints and prerecorded/saved evidence labelled with its original run and commit. If live execution exceeds its allotted time, stop and use the verified reference checkpoint transparently. Never claim replayed evidence was generated live. Prioritize real runtime proof and Q&A over optional model checking.

## 4. Exit gates

- Clean clone succeeds on documented platform(s); versions and prerequisites stated. Windows/PowerShell setup and a Linux CI path should be tested; do not claim platform coverage that was not run.
- Starter reproduces intended violation reliably in documented lab conditions; ordinary workflows operate and unaffected baseline tests pass.
- Solution passes required static, integration, runtime, browser and independent CI checks with actual evidence for all P0 criteria.
- Migration fails clearly on pre-existing duplicates; no automatic data deletion.
- Every participant command exists and is exercised; artifacts are tied to candidate SHA and survive cleanup.
- GrokBot capability spike passed, or limitation and manual/agent-independent fallback explicitly documented; do not market unverified native features.
- Source attribution and license obligations met; synthetic data only. Release requires human review.
