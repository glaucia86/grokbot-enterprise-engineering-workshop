# Enterprise Gap Analysis — Forensic Assessment of `grokbot-enterprise-engineering-workshop`

**Assessed revision:** `main` @ `d0b0226` (`Merge pull request #15`)  
**Assessment date:** 2026-11-26  
**Target event:** Packt Advanced Workshop — *GrokBot for Enterprise Engineering Workflows: From Issue to Verified Pull Request* (December 11, 2026, 60 minutes)  
**Assessment method:** Direct inspection of all repository source files, Drizzle migrations, scripts, tests, CI workflows, Reveal.js presentation, skill lockfile, Git history, and live execution of static/unit/property/engineering checks.

---

## 1. Executable Baseline Established

The following checks were executed directly against `main` @ `d0b0226` on Windows (Bun `1.4.5`, Node `v24.19.0`, Docker `29.8.2`, Chromium `1248`, no host `java`, no host `grokbot`):

| Check | Command | Exit Code | Observed Result |
| --- | --- | --- | --- |
| Static analysis & types | `bun run check:static` | `0` | ESLint 9 + `tsc --noEmit` clean |
| Unit & architecture tests | `bun run test:unit` | `0` | 19 passed across 3 files (incl. 2 ESLint boundary rejection fixtures) |
| Property-based tests | `bun run test:properties` | `0` | 2 passed (200 cases each, seed `4207`) |
| Harness unit tests | `bun test engineering/tests` | `0` | 4 passed across 4 files |
| Skill lock verification | `bun engineering/bootstrap-skills.ts --verify` | `0` | All 24 pinned skills matched SHA-256 lock digests |
| Local Docker daemon | `docker info --format "{{.ServerVersion}}"` | `0` | `29.8.2`, `postgres:18.7` image cached locally |
| Local Java / TLC | `java -version` | `127` | `java: command not found` — blocks current `verify:formal` without container fallback |
| Local GrokBot CLI | `which grokbot` | `1` | Not installed locally; native GrokBot execution unverified in this environment |

---

## 2. Sixteen-Dimension Enterprise Evaluation

### Dimension 1 — Enterprise Domain Complexity
- **Severity:** CRITICAL
- **Evidence:** `src/modules/procurement/domain/procurement.ts` (44 lines) models only `PurchaseRequest` (`title`, `justification`, `amountMinor`, `currency`, `status`), `TenantActor`, and `AuditEvent`. `src/server/db/schema.ts` has no cost centers, no budgets, no financial commitments, no approval authority limits, and no approval idempotency records.
- **Impact:** To an audience of Principal Engineers and Enterprise Architects, a single-table CRUD request with duplicate-submission deduplication reads as a toy tutorial rather than a mission-critical financial system.
- **Proposed Remediation:** Introduce `CostCenter` (allocated/committed/available budget), `FinancialCommitment`, `ApprovalPolicy` (`approvalLimitMinor`, non-self, role, tenant scope), and `DecisionIdempotencyRecord` within the existing Modular Monolith.
- **Verification Criteria:** Real PostgreSQL tables, Drizzle migrations, domain invariants `INV-01`..`INV-10`, API endpoints, and UI displaying live cost-center budget telemetry.

### Dimension 2 — Architectural Enforceability
- **Severity:** MEDIUM
- **Evidence:** `eslint.config.ts` already enforces zero external imports in `src/modules/procurement/domain/**/*.ts` and domain-only imports in `src/modules/procurement/application/**/*.ts`, backed by `tests/unit/architecture.test.ts`. However, `infrastructure/` is not prevented from importing UI/Next.js request primitives, `src/app/**/*.tsx` is not prevented from importing `drizzle-orm`/`postgres`/`infrastructure`, and there is no dedicated single-command live demo (`verify:architecture`) showing an architectural violation rejected on demand.
- **Impact:** Partial boundary enforcement leaves UI-to-database shortcuts unguarded and weakens the Pillar 01 live demonstration.
- **Proposed Remediation:** Expand `eslint.config.ts` boundary rules to `infrastructure/` and `src/app/**/*.tsx`, add domain monetary-safety constraints, add negative fixture tests for all 4 boundaries, and expose `bun run verify:architecture`.
- **Verification Criteria:** `bun run verify:architecture` proves ESLint rejects injected boundary violations across `domain`, `application`, `infrastructure`, and UI layers with exit code `1`.

### Dimension 3 — Domain Modeling
- **Severity:** HIGH
- **Evidence:** `src/modules/procurement/domain/procurement.ts` uses raw `number` for `amountMinor`, lacks explicit value objects (`MoneyMinor`, `BudgetSnapshot`), lacks explicit state-transition functions returning typed domain errors, and `doc-specs/DOMAIN-MODEL.md` covers only submission/decision basics without cost centers or financial commitments.
- **Impact:** Invalid monetary values or illegal state transitions rely on ad-hoc checks scattered in routes/infrastructure rather than making invalid states unrepresentable in the domain core.
- **Proposed Remediation:** Model branded `MoneyMinor`, `BudgetPosition`, `ApprovalPolicy`, explicit state transition guard `evaluateApprovalDecision()`, canonical fingerprint builders, and a clean domain glossary (`docs/domain/GLOSSARY.md`) following the installed `domain-modeling` skill.
- **Verification Criteria:** Pure zero-dependency unit tests + property-based tests verify every domain transition, monetary invariant, and policy boundary.

### Dimension 4 — Financial and Transactional Correctness
- **Severity:** CRITICAL
- **Evidence:** `src/modules/procurement/infrastructure/postgres-requests.ts` (`decide()`, lines 88–117) performs only a conditional status update on `purchase_requests` with no budget lookup, no financial commitment ledger, no row-level locking on budgets, no DB `CHECK (committed <= allocated)`, and no approval idempotency protection. Furthermore, `release/starter.patch` (48 lines) does **not** even remove `UNIQUE (tenant_id, idempotency_key)` on submissions — meaning the current `workshop/starter` has **zero live concurrency defect**! Instead, `scripts/verify-ph42-fixture.ts` passes a hardcoded JSON file (`fixtures/ph42-duplicate-snapshot.json`) into `jsonb_to_recordset` to simulate a historical failure.
- **Impact:** Demonstrating a "bug" solely from a static JSON snapshot while the live starter app passes concurrency checks undermines technical credibility with senior engineers.
- **Proposed Remediation:** Replace PH-42 with a genuine live concurrent financial approval race (`$7,000 + $7,000` against `$10,000` budget on `CC-ENG-01`). Starter executes a classic TOCTOU read-then-check-then-update defect (with a strictly lab-only synchronization barrier) that genuinely overspends real PostgreSQL (`$14,000` committed, `-$4,000` available). Solution enforces ACID locking (`SELECT ... FOR UPDATE`), DB `CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor)`, `UNIQUE (tenant_id, request_id)` commitments, and `decision_idempotency_keys`.
- **Verification Criteria:** `bun run ph42:reproduce` exits `1` on `workshop/starter` with real PostgreSQL showing `$14,000` committed vs `$10,000` allocated, and exits `0` on `workshop/solution` with `$7,000` committed, `$3,000` available, and `409 INSUFFICIENT_BUDGET` for the loser.

### Dimension 5 — Tenant Isolation and Authorization
- **Severity:** HIGH
- **Evidence:** Existing tenant isolation and RBAC (`REQUESTER`, `APPROVER`, `AUDITOR`, non-self-approval) in `src/modules/procurement/infrastructure/postgres-requests.ts` and `src/server/auth/lab-session.ts` are well-structured, but lack organizational approval authority policies (`approvalLimitMinor`), lack cross-tenant cost center foreign key enforcement, and do not test authorization enforcement on idempotent approval replay paths (`INV-06`).
- **Impact:** Does not cover enterprise approval authority tiers or the classic security flaw where cached idempotency replays bypass re-authorization after role/limit revocation.
- **Proposed Remediation:** Add `approval_limit_minor` on `memberships`, composite FKs `(tenant_id, cost_center_id)`, enforce server-side session + role + non-self + tenant + approval-limit checks **before** returning any idempotent replay, and create a dedicated `tests/security/` suite.
- **Verification Criteria:** `bun run test:security` verifies `404` on cross-tenant cost-center/request access, `403` on unauthorized roles/self-approval/limit exceeded, and `403` when an actor loses authority before replaying a prior approval key.

### Dimension 6 — Test Quality and Reliability
- **Severity:** HIGH
- **Evidence:** Tests use `bun:test` (not Vitest), lack dedicated concurrency tests (`tests/concurrency/`), lack dedicated security regression tests (`tests/security/`), and property tests (`tests/properties/contract.test.ts`, 63 lines) only test string trimming and single-request status toggles — not budgets, amounts, repeated keys, or multi-tenant sequences.
- **Impact:** Test suite does not stress-test financial invariants under real multi-connection contention or randomized adversarial sequences.
- **Proposed Remediation:** Adopt Vitest (`vitest.config.ts`) on Bun 1.4.5, add `tests/concurrency/` (multi-connection HTTP + high-contention burst + same-key concurrent retries), `tests/security/`, expanded `fast-check` property suites with reproducible seeds and shrunk counterexample logging, and Playwright E2E covering budget commitment & insufficient-budget feedback.
- **Verification Criteria:** All suites (`test:unit`, `test:integration`, `test:concurrency`, `test:security`, `test:properties`, `test:e2e`, `test:harness`) execute cleanly with real PostgreSQL and Chromium.

### Dimension 7 — Runtime Verification
- **Severity:** MEDIUM
- **Evidence:** `engineering/verify-lab.ts` is well-engineered (ephemeral ports, isolated Compose project, doctor check, cleanup preserving manifests). However, it only produces JSON manifests (`manifest.json`), lacks a human-readable `summary.md`, does not capture before-and-after financial DB snapshots or intentional Playwright verification screenshots on success, and `skills/verify-procurement/features/` contains only 3 short files (9–10 lines each).
- **Impact:** Agents and reviewers lack rich, navigable feature maps and before/after financial runtime evidence.
- **Proposed Remediation:** Upgrade `engineering/verify-lab.ts` to emit `artifacts/verification/<run-id>/manifest.json` + `summary.md` + DB snapshots + HTTP transcripts + Playwright screenshots/traces surviving cleanup; expand `skills/verify-procurement/SKILL.md` and create all 8 structured feature maps.
- **Verification Criteria:** Full `verify:all` execution passes and retains both machine-readable and human-readable evidence after cleanup tears down app + Compose DB.

### Dimension 8 — Formal Verification
- **Severity:** HIGH
- **Evidence:** `formal/PH42.tla` (63 lines) models only duplicate request submission keys, not concurrent budget approvals, budget bounds, idempotent approval retries, or audit consistency. `engineering/verify-formal.ts` fails locally when host `java` is missing (`java: command not found`) and requires manually downloading `tla2tools.jar`.
- **Impact:** Formal verification is disconnected from the financial approval incident and cannot execute locally on typical TypeScript developer workstations without manual JDK installation.
- **Proposed Remediation:** Author `formal/ProcurementApproval.tla` with `defective-read-commit.cfg` (counterexample violating `BudgetNotExceeded`) and `locked-atomic.cfg` (exhaustive bounded proof of `BudgetNotExceeded`, `NonNegativeAvailability`, `CommitmentMatchesApprovedSum`, `AuditMatchesApproved`, `IdempotentReplayConsistent`). Upgrade `engineering/verify-formal.ts` to auto-fallback to pinned Docker JRE (`eclipse-temurin:21-jre-alpine`) with SHA-256-verified `tla2tools.jar`, and add `skills/verify-formal-approval/SKILL.md`.
- **Verification Criteria:** `bun run verify:formal` executes real TLC locally via Docker, produces a genuine exit-12 counterexample trace on the defective config and exit-0 exhaustive state check on the locked-atomic config, and writes versioned evidence under `artifacts/formal/`.

### Dimension 9 — Harness Engineering
- **Severity:** MEDIUM
- **Evidence:** `package.json` lacks ergonomic single-command entry points for `lab:bootstrap`, `lab:reset`, `lab:seed:ph42`, `ph42:reproduce`, `verify:architecture`, `test:concurrency`, `test:security`, `test:harness`, and `loop:run`.
- **Impact:** Participants and agents must remember raw script paths or multi-step sequences.
- **Proposed Remediation:** Standardize all harness operations as documented TypeScript scripts wired through `package.json`.
- **Verification Criteria:** Every command in `package.json` is documented, executable, and verified in clean-checkout rehearsal.

### Dimension 10 — Loop Engineering
- **Severity:** HIGH
- **Evidence:** `engineering/check-slice.ts` enforces a 3-attempt cap (`maxAttempts = 3`), but has no structured hypothesis ledger, no scope-expansion guard, no consecutive-failure escalation tracking, no refusal to re-run identical failing commands without a changed hypothesis/diff, and no persisted resume handoff outside the chat window.
- **Impact:** Does not teach or execute true bounded self-correcting Loop Engineering inspired by Poteto Mode.
- **Proposed Remediation:** Implement `engineering/loop-runner.ts` (`bun run loop:run` / `bun run loop:status`) with persisted `artifacts/loop/<run-id>/state.json` + `handoff.md`, configurable budgets, hypothesis gating, protected-file scope guard, and structured escalation.
- **Verification Criteria:** Unit tests + live dry/real runs prove the loop enforces budgets, blocks repeated identical runs without new hypothesis, and persists resumable handoffs.

### Dimension 11 — Agent Specialization
- **Severity:** HIGH
- **Evidence:** Reveal.js slides show 5 avatar characters, but the repository has no concrete role charters, falsification checklists, or fresh-context handoff protocol separating Engineering Lead, TypeScript Engineering Agent, Quality Engineering Agent, Security Engineering Agent, Platform Engineering Agent, and Human Reviewer.
- **Impact:** Agent roles look decorative rather than operationalized into an enterprise SDLC workflow.
- **Proposed Remediation:** Create `docs/agents/AGENT-ROLES.md` with explicit charters, input/output contracts, independent verification commands, adversarial falsification checklists for QA & Security, and honest documentation of sequential fresh-context execution vs native multi-agent capabilities.
- **Verification Criteria:** Role charters map directly to executable repository commands and are exercised during Phase 07 independent review.

### Dimension 12 — Evidence Integrity
- **Severity:** MEDIUM
- **Evidence:** `engineering/ci-evidence.ts` and `engineering/verify-lab.ts` already enforce exact commit SHA binding and reject dirty worktrees. However, there is no human-readable evidence report (`summary.md`), no automatic check flagging modifications to protected verifier/acceptance files, and no linkage of property-test seeds or formal TLC hashes into a unified delivery summary.
- **Impact:** Reviewers must inspect scattered JSON files and manually notice if a candidate weakened tests or workflow files.
- **Proposed Remediation:** Unify human + machine evidence output (`manifest.json` + `summary.md`), bind exact SHA + dirty status + seeds + TLC digests + Playwright screenshots, and add a CI `governance-guard` job that explicitly surfaces changes to acceptance specs, test harnesses, ESLint boundaries, or workflows.
- **Verification Criteria:** Generated evidence manifests fail validation on dirty trees or SHA mismatches and include all check results + artifact paths.

### Dimension 13 — Software Delivery Governance
- **Severity:** HIGH
- **Evidence:** `.github/workflows/workshop-verification.yml` runs one monolithic job (`verify`), does not execute property tests or formal TLA+ verification, has no governance guard for verifier changes, and `.github/pull_request_template.md` (19 lines) omits root cause, architectural implications, invariants, security implications, rollback/forward-recovery, and human approval checklist.
- **Impact:** Does not reflect enterprise CI/CD gate separation or reviewable governance controls.
- **Proposed Remediation:** Split CI into 6 least-privilege independent gate jobs (`static-and-architecture`, `unit-and-properties`, `integration-concurrency-security`, `runtime-e2e-and-evidence`, `formal-verification`, `governance-guard`), upgrade `.github/pull_request_template.md` to all 11 enterprise sections, and add `docs/governance/ENTERPRISE-GOVERNANCE.md`.
- **Verification Criteria:** Workflow YAML validated; every gate's underlying commands executed and verified locally; distinction between workflow files and administrative branch protection explicitly documented.

### Dimension 14 — Demonstration Reproducibility
- **Severity:** CRITICAL
- **Evidence:** `git branch -a` has no `workshop/starter`, `workshop/guided`, or `workshop/solution` branches, and `git tag -l` is empty. `engineering/package-workshop.ts` only emits starter/solution bundles without a guided tier, and starter doesn't actually reproduce a live concurrency defect.
- **Impact:** Facilitator has no Git recovery checkpoints during a live 60-minute session, and participants cannot cleanly check out starter, guided, or solution branches afterward.
- **Proposed Remediation:** Build verified local branches `workshop/starter`, `workshop/guided`, `workshop/solution` and 6 local checkpoint tags (`checkpoint-00-starter`..`checkpoint-05-pr-ready`), plus update `engineering/package-workshop.ts` to validate spoiler-free packaging across all three editions.
- **Verification Criteria:** Clean clones of all three branches into isolated temp directories execute cleanly with starter reproducing PH-42 (`exit 1`) and solution passing all checks (`exit 0`).

### Dimension 15 — Educational Quality
- **Severity:** HIGH
- **Evidence:** Slides (`slides/index.html`) and `slides/presenter-guide.md` narrate the old duplicate-submission static-snapshot scenario, omit cost centers/budgets/overspending, omit Dumb vs Smart Zone slicing, omit the 8-entry feature map, and there is no Reusable Enterprise Starter Kit for participants to take back to their own teams.
- **Impact:** Senior attendees leave without an actionable blueprint they can adopt in brownfield enterprise repositories.
- **Proposed Remediation:** Build `starter-kit/` (12 reusable templates + brownfield incremental adoption guide), add Dumb Zone vs Smart Zone slicing (`docs/architecture/VERTICAL-SLICES.md`), and realign the Reveal.js presentation strictly after the technical implementation is verified.
- **Verification Criteria:** Every slide claim traces to an actual verified repository file/command; `bun run slides:verify` passes.

### Dimension 16 — Participant Experience
- **Severity:** HIGH
- **Evidence:** No `docs/workshop/PARTICIPANT-GUIDE.md` and no `docs/workshop/FACILITATOR-GUIDE.md` exist. Existing README instructions omit PowerShell/Git Bash/macOS/Linux nuances, troubleshooting, GrokBot configuration + portable fallback, formal verification walkthrough, and advanced challenges.
- **Impact:** Post-workshop independent replication is fragile across OSes and participant environments.
- **Proposed Remediation:** Author comprehensive `docs/workshop/PARTICIPANT-GUIDE.md` (all 23 required sections) and `docs/workshop/FACILITATOR-GUIDE.md` (minute-by-minute 60-min live runbook with checkpoints and fallbacks) and validate from a clean checkout.
- **Verification Criteria:** Every command in `PARTICIPANT-GUIDE.md` tested end-to-end against a clean isolated checkout.

---

## 3. Component Disposition Matrix (Preserve / Improve / Replace / Remove)

| Component | Disposition | Rationale |
| --- | --- | --- |
| `src/modules/procurement/{domain,application,infrastructure}` | **IMPROVE** | Preserve clean Modular Monolith layering; expand with Cost Centers, Budgets, Financial Commitments, Approval Policies, and Approval Idempotency. |
| `src/server/auth/lab-session.ts`, `src/server/db/lab-config.ts`, `src/server/http/lab-responses.ts` | **IMPROVE** | Preserve secure server-side session & loopback guard; add `approvalLimitMinor` to session identity and new error codes (`INSUFFICIENT_BUDGET`, `APPROVAL_LIMIT_EXCEEDED`). |
| `src/app/` (Next.js 16 App Router pages & forms) | **IMPROVE** | Preserve clean server-component + client-form structure; add Cost Center budget overview, Cost Center selection on request creation, budget display on detail page, and idempotent approval form. |
| `drizzle/0000_*`, `0001_*` | **PRESERVE** | Keep existing migration history intact; add tracked migrations `0002_cost_centers_and_commitments.sql` and `0003_approval_integrity_constraints.sql`. |
| `eslint.config.ts` & `tests/unit/architecture.test.ts` | **IMPROVE** | Keep working boundary rules; extend to `infrastructure/` and UI (`src/app/**/*.tsx`) + add `verify:architecture`. |
| `fixtures/ph42-duplicate-snapshot.json`, `scripts/verify-ph42-fixture.ts` | **REPLACE** | Replace static JSON snapshot "reproduction" with real live concurrent HTTP + PostgreSQL reproduction (`scripts/reproduce-ph42.ts`). |
| `formal/PH42.tla`, `formal/stale-check.cfg`, `formal/atomic.cfg` | **REPLACE** | Replace submission-only TLA+ model with `formal/ProcurementApproval.tla` modeling concurrent financial approvals, budget bounds, retries, and audit consistency; add Docker JRE runner in `engineering/verify-formal.ts`. |
| `engineering/verify-lab.ts`, `engineering/check-slice.ts`, `engineering/ci-evidence.ts` | **IMPROVE** | Keep isolated ephemeral-port harness & SHA-bound manifests; add `summary.md`, DB before/after snapshots, screenshots, Vitest + formal integration, and `engineering/loop-runner.ts`. |
| `engineering/bootstrap-skills.ts`, `engineering/skills-lock.json` | **PRESERVE** | All 24 pinned skills verify cleanly offline via SHA-256 lockfile. |
| `skills/verify-procurement/SKILL.md` & `features/` | **IMPROVE** | Expand into full pstack-grade verification skill + 8 structured feature maps; add `skills/verify-formal-approval/SKILL.md`. |
| `release/starter.patch`, `engineering/package-workshop.ts` | **REPLACE / IMPROVE** | Replace trivial hash-only starter patch with genuine defective starter vs guided vs solution packaging and clean local Git branches + checkpoint tags. |
| `.github/workflows/workshop-verification.yml`, `.github/pull_request_template.md` | **IMPROVE** | Split single CI job into 6 least-privilege independent gates and expand PR template to 11 governance sections. |
| `slides/` (Reveal.js 6 + Bloub avatar cast + bilingual build) | **IMPROVE** | Preserve visual polish, avatar cast, and bilingual presenter build; realign slides, diagrams, and EN/PT-BR speaker notes strictly to the verified PH-42 financial approval implementation. |
| `bun.lock`, `compose.yaml`, `.env.example` | **PRESERVE / IMPROVE** | Keep pinned Bun 1.4.5 and PostgreSQL 18.7; add pinned Vitest to `package.json`/`bun.lock`. |
