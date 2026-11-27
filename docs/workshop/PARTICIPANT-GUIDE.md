# Participant Replication Guide — GrokBot for Enterprise Engineering Workflows

**Workshop:** *GrokBot for Enterprise Engineering Workflows: From Issue to Verified Pull Request*  
**Reference Application:** Procurement Hub (Modular Monolith · Next.js 16 · TypeScript 5.9 · PostgreSQL 18.7 · Drizzle ORM · Vitest · fast-check · Playwright · TLA+/TLC)  
**Target Incident:** `PH-42 — Concurrent Procurement Approval Violates Financial and Tenant Isolation Invariants`

This guide lets you reproduce the entire enterprise workshop independently from a clean checkout, without access to the live workshop environment.

---

## 1. Learning Objectives

By completing this lab, you will practice how to:

1. Apply Lauren Tan's **Trust Pyramid** (workshop 5-layer decomposition) to prioritize enforceable architecture, database constraints, and deterministic checks over prompt prose.
2. Reproduce a real multi-connection financial concurrency bug (`$7,000 + $7,000 > $10,000` budget overrun) against a running Next.js application and PostgreSQL 18.
3. Operate a repository-local **Verification Harness** (`verify-procurement` skill + 8 actionable Feature Maps) that launches, diagnoses, drives, collects evidence, and cleans up safely.
4. Run a bounded, hypothesis-driven **Loop Engineering** cycle (`engineering/loop-runner.ts`) with GrokBot (or any coding agent / manual workflow).
5. Verify financial, idempotency, tenant-isolation, and authorization invariants (`INV-01`–`INV-10`) using unit, integration, concurrency, security, property-based (`fast-check`), browser E2E (Playwright), and bounded **TLA+/TLC** model checking.
6. Assemble a revision-bound, evidence-backed Pull Request ready for independent CI and human review.

---

## 2. Prerequisites

Install these exact supported tools before starting:

| Tool | Required Version | Purpose |
| --- | --- | --- |
| **Git** | 2.40+ | Branch checkout, diff inspection, SHA-bound evidence |
| **Bun** | **1.4.5** (pinned in `package.json` / `bun.lock`) | Repository runtime, package manager, TypeScript scripts, Vitest & Playwright driver |
| **Docker & Docker Compose v2** | Docker Engine 24+ / Desktop with `docker compose` | Disposable PostgreSQL `18.7` database **and** automatic Dockerized TLC (`eclipse-temurin:21-jre-alpine`) — **no host Java/JDK installation required** |
| **Chromium** (installed via script) | Pinned by Playwright (`bun run browser:install`) | Real browser E2E verification |
| **GrokBot** *(optional for core exercise)* | Authenticated CLI / IDE session | Agent demonstration (portable manual/alternative-agent workflow included below) |

### Installing Bun 1.4.5

- **macOS / Linux / Git Bash:** `curl -fsSL https://bun.sh/install | bash -s "bun-v1.4.5"`
- **Windows PowerShell:** `powershell -c "irm bun.sh/install.ps1 | iex"` (then confirm `bun -v` prints `1.4.5`)

---

## 3. Supported Operating Systems

| Environment | Shell Notes |
| --- | --- |
| **Windows 11 / 10 (PowerShell 7+)** | Use `Copy-Item .env.example .env`. Ensure Docker Desktop is running with a local context (`docker context ls`). |
| **Windows (Git Bash)** | Use `cp .env.example .env`. Avoid MSYS path mangling when passing container paths (`MSYS_NO_PATHCONV=1` if invoking `docker run` directly; `verify:formal` handles Windows paths automatically). |
| **macOS (Apple Silicon / Intel, zsh/bash)** | Use `cp .env.example .env`. Ensure Docker Desktop or Colima provides a local Unix socket context. |
| **Linux (Ubuntu 22.04/24.04, bash)** | Use `cp .env.example .env`. Run `bun run browser:install --with-deps` if Chromium system libraries are not yet installed. |

---

## 4. Repository Checkout

Clone the workshop repository into a clean working directory:

```bash
git clone <workshop-repo-url> procurement-hub-lab
cd procurement-hub-lab
```

Check available branches and recovery checkpoints:

```bash
git branch -a
git tag -l
```

---

## 5. Starter Branch Setup

Switch to the spoiler-free defective starter branch and create your personal working branch so you never overwrite starter history:

```bash
git checkout workshop/starter
git checkout -b fix/ph42-my-attempt
```

> **Want progressive hints without jumping straight to the answer?** Use `git checkout workshop/guided` instead — it includes `GUIDED-WORKSHEET.md` with structured diagnostic hints and intermediate milestones.

---

## 6. Environment Bootstrap

Copy the disposable loopback environment file:

- **Bash / zsh / Git Bash:** `cp .env.example .env`
- **Windows PowerShell:** `Copy-Item .env.example .env`

Install locked dependencies, install Playwright Chromium, and boot PostgreSQL 18.7:

```bash
bun install --frozen-lockfile
bun run browser:install
bun run lab:bootstrap
```

`bun run lab:bootstrap` starts Docker PostgreSQL on `127.0.0.1:55432`, applies all tracked Drizzle migrations, seeds 2 synthetic tenants, 9 identities, and 3 Cost Centers, and verifies database readiness via `lab:doctor --db-only`.

---

## 7. GrokBot Configuration (and Portable Alternative)

### Using GrokBot

1. Authenticate GrokBot against your approved enterprise or workshop account.
2. Open the `procurement-hub-lab` folder on your scoped branch (`fix/ph42-my-attempt`).
3. Confirm GrokBot has **least-privilege** access: read/write files inside this repo and run local terminal commands — **no** production credentials, **no** force-push, and **no** merge rights on `main`.
4. Direct GrokBot to read `AGENTS.md`, `doc-specs/03-demo-issue-42.md`, and `skills/verify-procurement/SKILL.md` first.

> **Portability Note:** This workshop does **not** assume Cursor-specific `pstack` slash commands exist natively in GrokBot. Every capability (verification skill, feature maps, architecture check, loop runner, formal checker) is exposed as standard repository-local files and `bun run ...` commands.

### Portable Alternative (Without GrokBot Account Access)

If you do not have GrokBot access, you can complete 100% of this lab using any terminal-capable coding agent (e.g., Codex, Claude Code, Cursor, Devin) **or** by executing the exact same investigation, implementation, `loop:run`, and `verify:all` commands yourself from the terminal.

---

## 8. Verification of Prerequisites

Start the application in **Terminal 1**:

```bash
bun run dev
```

In **Terminal 2**, verify readiness, static types, and enforceable architecture boundaries:

```bash
bun run lab:doctor
bun run check:static
bun run verify:architecture
bun run test:unit
```

Expected observations:
- `lab:doctor` outputs `"status":"pass"` with `tenants: 2`, `requiredIdentities: 7`, `costCenters: 3`, `healthStatus: 200`, and `401` on anonymous requests.
- `verify:architecture` prints `"status":"pass"` showing all 5 negative boundary fixtures rejected by ESLint.
- `test:unit` passes cleanly under Vitest.

---

## 9. Application Exploration

Open `http://127.0.0.1:3000` in your browser and explore Procurement Hub:

1. Switch to **Northstar Requester** (`northstar-requester`). Notice the **Cost center budgets** panel showing `CC-ENG-01` (`$10,000.00` allocated) and `CC-OPS-01` (`$25,000.00` allocated).
2. Submit a purchase request for `CC-OPS-01` (e.g., `15000` cents = `$150.00`). Note that `Committed` stays `$0.00` while the request is `PENDING`.
3. Switch to **Northstar Team Lead** (`northstar-junior-approver`, limit `$5,000.00`) and verify the approval limit shown in the session banner.
4. Switch to **Northstar Approver** (`northstar-approver`, limit `$25,000.00`), open your request, approve it, and confirm the **Financial commitment** panel appears and `CC-OPS-01` Committed updates to `$150.00`.
5. Switch to **Northstar Auditor** (`northstar-auditor`) to inspect the read-only `CREATED` + `APPROVED` audit trail.
6. Switch to **Meridian Requester** (`meridian-requester`) and confirm Northstar Cost Centers and requests are completely invisible (visiting a Northstar `/requests/<id>` URL returns `404`).

---

## 10. Architecture Walkthrough

Inspect the four Modular Monolith layers enforced by `eslint.config.ts`:

- **Domain (`src/modules/procurement/domain/procurement.ts`)**: pure zero-dependency types (`MoneyMinor`, `CostCenter`, `evaluateApprovalAuthority`, `canCommitAmount`, state machine). Floating-point `parseFloat` and external imports are banned by ESLint.
- **Application (`src/modules/procurement/application/requests.ts`)**: use cases and repository ports; may import only domain and sibling application modules.
- **Infrastructure (`src/modules/procurement/infrastructure/postgres-requests.ts`)**: Drizzle + PostgreSQL ACID adapter; cannot import React/Next UI or session controllers.
- **Web/API Composition (`src/app/**`, `src/server/**`)**: Zod validation, server-side session resolution (`lab-session.ts`), and route handlers; UI components cannot import database clients directly.

---

## 11. Incident Investigation

Read the incident specification and invariant requirements:

- `doc-specs/03-demo-issue-42.md`
- `PRD.md` (`INV-01` through `INV-10`)
- `SPEC.md`
- `docs/domain/GLOSSARY.md`

Inspect `src/modules/procurement/infrastructure/postgres-requests.ts` (`decide()`) and `drizzle/0002_cost_centers_and_commitments.sql`. Identify **every** layer where financial and idempotency invariants are currently unprotected on `workshop/starter`.

---

## 12. Failure Reproduction

With `bun run dev` running in Terminal 1, reproduce **PH-42** live from Terminal 2:

```bash
bun run ph42:reproduce
```

Observe the real PostgreSQL output:
- Exit code: **`1`** (expected failure on starter!)
- `httpStatuses`: **`[200, 200]`** — both `$7,000.00` requests were approved!
- `before`: `allocatedBudgetMinor: 1000000`, `committedBudgetMinor: 0`, `availableBudgetMinor: 1000000`
- `after`: `allocatedBudgetMinor: 1000000`, `committedBudgetMinor: 1400000`, **`availableBudgetMinor: -400000`** (`-$4,000.00`!)
- `violatedInvariants`: **`["INV-01", "INV-02"]`**

Refresh `http://127.0.0.1:3000` as **Northstar Approver** to see `CC-ENG-01` highlighted red as **`-$4,000.00 (OVERSPENT)`** in the live UI!

---

## 13. Engineering Harness Walkthrough

Review the reusable verification infrastructure before making changes:

1. Read `skills/verify-procurement/SKILL.md` (Launch, Doctor, Drive, Evidence, Cleanup).
2. Browse the 8 Feature Maps in `skills/verify-procurement/features/README.md`.
3. Initialize a bounded loop ledger to track your hypotheses:

```bash
bun engineering/loop-runner.ts init --run-id my-ph42-fix --issue PH-42 --max-iterations 3 --max-consecutive-failures 2
bun run loop:run -- --run-id my-ph42-fix --stage reproduce --hypothesis "Starter decide() checks committed_budget_minor without row lock or DB CHECK" --cmd "bun run ph42:reproduce"
bun run loop:status -- --run-id my-ph42-fix
```

Notice that running the exact same failing command again without changing your hypothesis or code triggers the **Anti-spin guard** (`exit 2`).

---

## 14. Agent Task Prompt

Submit this bounded prompt to GrokBot (or your coding agent):

```text
Investigate and fix PH-42 in this isolated Procurement Hub lab checkout.

1. Read AGENTS.md, doc-specs/03-demo-issue-42.md, SPEC.md, and skills/verify-procurement/SKILL.md first.
2. Reproduce the defect live using `bun run ph42:reproduce` and confirm the overspent PostgreSQL state before changing code.
3. Formulate a root-cause hypothesis addressing INV-01 through INV-10:
   - Prevent concurrent budget overspending across multiple app instances (no sleep delays or in-process mutexes).
   - Add defense-in-depth PostgreSQL constraints and safe migration preflight checks (refuse dirty legacy data without deleting rows).
   - Implement tenant-scoped approval idempotency (`decision_idempotency_keys`) with canonical payload conflict checks (409 IDEMPOTENCY_CONFLICT) and mandatory authorization re-checking before idempotent replay (INV-06).
   - Ensure full ACID rollback on pre-commit failure (INV-09, INV-10).
   - Remove the lab-only sync barrier from the production approval path.
4. Preserve all 4-layer ESLint architectural boundaries (`bun run verify:architecture`).
5. Verify against real PostgreSQL and Chromium using `bun run check:static`, `bun run test:unit`, `bun run test:integration`, `bun run test:concurrency`, `bun run test:security`, `bun run test:properties`, `bun run test:e2e`, and `bun run ph42:reproduce`.
6. Stop and escalate after at most 2 self-correction attempts if blocked. Never weaken tests, acceptance criteria, or ESLint rules. Do not merge or self-approve.
```

---

## 15. Implementation Exercises

Implement (or review your agent's implementation of) the fix in verifiable vertical steps:

1. **Database Constraints & Idempotency Table (`drizzle/0003_approval_integrity_constraints.sql` + `drizzle/meta/_journal.json` + `src/server/db/schema.ts`):**
   - Lock `cost_centers` and `financial_commitments`, run preflight checks failing with `23514` (overspent) and `23505` (duplicate commitments) without deleting rows.
   - Add `CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor)`.
   - Add `UNIQUE (tenant_id, request_id)` on `financial_commitments`.
   - Create `decision_idempotency_keys` with composite PK `(tenant_id, idempotency_key)` and composite tenant FKs.
2. **ACID Transactional Approval (`src/modules/procurement/infrastructure/postgres-requests.ts`):**
   - Check existing `decision_idempotency_keys`; verify actor + requestId + decision + normalized reason (`409 IDEMPOTENCY_CONFLICT` on mismatch); **re-verify `evaluateApprovalAuthority` before returning `200` replay (`INV-06`)**.
   - Acquire deterministic row locks: `cost_centers ... FOR UPDATE` first, then `purchase_requests ... FOR UPDATE`.
   - Reserve `decision_idempotency_keys` with `ON CONFLICT DO NOTHING` + fresh `READ COMMITTED` re-read on conflict.
   - Roll back cleanly on `INVALID_TRANSITION`, `INSUFFICIENT_BUDGET`, or DB error so zero orphan keys persist.
   - Remove `waitForLabSyncBarrier` from `decide()` and `decision/route.ts`.
3. **Apply migrations:** Stop/restart `bun run dev` after running `bun run lab:reset && bun run lab:init`.

---

## 16. Runtime Verification

Run the complete isolated one-shot verification harness (remember to stop any manual `bun run dev` if you want a clean port, though `verify:all` allocates ephemeral loopback ports automatically):

```bash
git status   # Ensure your candidate changes are committed cleanly
bun run verify:all --slice solution --run-id my-solution-proof
```

Confirm after `cleanup` finishes that BOTH files still exist on disk:
- `artifacts/verification/solution/my-solution-proof/manifest.json`
- `artifacts/verification/solution/my-solution-proof/summary.md`

---

## 17. Concurrency & Security Verification

Run targeted Layer 2/3 verification suites against the running lab:

```bash
bun run ph42:reproduce              # Expect exit 0, [200, 409 INSUFFICIENT_BUDGET], committed=700000, available=300000
bun run test:concurrency            # 6-way $3k burst, concurrent same-key retries, key collisions
bun run test:security               # Cross-tenant 404, approval limit 403, revoked-role replay 403
bun run test:migration              # Clean upgrade + dirty overspent 23514 & duplicate 23505 refusal
bun run test:properties             # fast-check 400 randomized cases with pinned seed 4207
bun run test:e2e                    # Playwright Chromium journeys & screenshots
```

---

## 18. Formal Verification Exercise (TLA+ / TLC)

Run the bounded formal model checker (**no host Java required** — Docker runs pinned `eclipse-temurin:21-jre-alpine` automatically if `java` is absent):

```bash
bun run verify:formal --run-id my-formal-check
```

Open `artifacts/formal/my-formal-check/summary.md` and observe:
1. `defective-read-commit.cfg` (`LockBudget = FALSE`): exits **`12`** with the exact 7-step counterexample trace violating `BudgetNotExceeded` (`committed = 14 > 10`).
2. `locked-atomic.cfg` (`LockBudget = TRUE`): exits **`0`** after exhaustively checking all `473` generated (`225` distinct) states with `0` states left on queue across all 6 safety invariants including lost-response retries.

Read `formal/README.md` and `skills/verify-formal-approval/SKILL.md` for model-to-code correspondence and explicit scope limitations.

---

## 19. Evidence-Based Pull Request Creation

1. Copy `.github/pull_request_template.md` into your PR description.
2. Fill in the exact `git rev-parse HEAD` SHA (`worktreeDirty: false`), root cause, ADRs, invariant checklist (`INV-01`–`INV-10`), actual command outputs, evidence paths (`summary.md`), formal results, migration notes, and known limitations.
3. Let independent GitHub Actions execute all 6 quality gates (`static-and-architecture`, `unit-and-properties`, `integration-concurrency-security`, `runtime-e2e-and-evidence`, `formal-verification`, `governance-guard`).
4. Leave final review and merge to a human reviewer.

---

## 20. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Copy .env.example to .env first` | Missing `.env` file | Run `cp .env.example .env` (PowerShell: `Copy-Item .env.example .env`). |
| `Select a local Docker context` | Remote/inactive Docker context | Start Docker Desktop and run `docker context use default`. |
| `bun run lab:doctor` exits `2` | DB not initialized or `bun run dev` not running | Run `bun run lab:bootstrap`, start `bun run dev` in another terminal, then re-run `bun run lab:doctor`. |
| `The checkout already has a lab run in progress` | Stale `artifacts/verification/.active` lock dir | Confirm no `verify:all` process is active, then remove the empty `.active` folder. |
| `verify:all` exits `1` with `worktreeDirty: true` | Uncommitted edits in Git | Commit your changes and re-run `verify:all` with a fresh `--run-id`. |
| Playwright browser missing | Chromium not downloaded | Run `bun run browser:install` (Linux: `bun run browser:install --with-deps`) or set `WORKSHOP_CHROMIUM_PATH`. |
| Offline formal check (`verify:formal`) | No internet to fetch `tla2tools.jar` | Download TLA+ v1.7.4 `tla2tools.jar` once and pass `--jar /path/to/tla2tools.jar`. |

---

## 21. Environment Cleanup

- Stop the manual Next.js dev server with `Ctrl+C`.
- Stop the Compose PostgreSQL container: `bun run lab:down` (add `--volumes` if you want to wipe the local lab volume completely).
- Reset only synthetic database rows while keeping PostgreSQL running: `bun run lab:reset`.
- `bun run verify:all` automatically tears down its ephemeral Next.js process and Compose project/volume while preserving `artifacts/verification/`.

---

## 22. Optional Advanced Challenges

1. **Budget Release / Cancellation Transition:** Add a `CANCELLED` state for `APPROVED` requests with atomic `committed_budget_minor` decrement, reversal `financial_commitments` audit event, and updated `ProcurementApproval.tla` invariants.
2. **PostgreSQL Row-Level Security (RLS):** Enforce `INV-05` at the PostgreSQL session layer using `SET LOCAL app.current_tenant_id` policies and verify zero cross-tenant leakage even if a `WHERE tenant_id = ...` predicate is omitted.
3. **Adopt in Your Own Brownfield Repo:** Copy the 12 reusable templates from `starter-kit/` and follow `starter-kit/BROWNFIELD-ADOPTION-GUIDE.md`.

---

## 23. Solution Branch Instructions

To compare your work against the complete verified reference implementation:

```bash
git checkout workshop/solution
bun install --frozen-lockfile
bun run verify:all --slice solution --run-id solution-rehearsal
bun run verify:formal --run-id solution-formal
```

Or jump to any intermediate recovery checkpoint tag (`checkpoint-00-starter` through `checkpoint-05-pr-ready`) via `git checkout <tag>`.
