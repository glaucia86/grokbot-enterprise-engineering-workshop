# Facilitator Guide — 60-Minute Live Workshop Runbook

**Session:** *GrokBot for Enterprise Engineering Workflows: From Issue to Verified Pull Request*  
**Event:** Packt Advanced Workshop · December 11, 2026 · **Duration:** 60 minutes  
**Audience:** Principal/Staff Engineers, Architects, Tech Leads, Engineering Managers

> **Integrity Rule:** Never present pre-captured or rehearsal artifacts as results generated live. If you switch to a fallback artifact or recovery checkpoint, announce it transparently with its original commit SHA and run ID.

---

## 1. Pre-Session Environment Checklist (T-30 min)

1. Prepare TWO clean local checkouts (or use checkpoint tags cleanly):
   - **Demo checkout** on `workshop/starter` (with `.env` copied, `bun install --frozen-lockfile`, `bun run browser:install`, `bun run lab:bootstrap`, `bun run lab:seed:ph42`, and `bun run dev` running at `http://127.0.0.1:3000`).
   - **Pre-cached Docker images:** `postgres:18.7` AND `eclipse-temurin:21-jre-alpine`, plus cached `artifacts/.cache/tla2tools-1.7.4.jar` so `verify:formal` runs offline in <5 seconds!
2. Open windows in presentation order (keep presenter notes on private screen):
   - Reveal.js presenter deck (`bun run slides:preview:presenter`, press `S` for speaker notes; audience window at `#/start`).
   - Browser tab at `http://127.0.0.1:3000` (signed in as `northstar-approver`, showing `CC-ENG-01` with `$10,000.00` available and Request A & B `$7,000.00` each).
   - Terminal zoomed to 18–20pt at demo repo root.
   - Authenticated GrokBot workspace on a fresh branch `fix/ph42-live` from `workshop/starter`.
   - GitHub PR & Actions tab pre-opened for Pillar 04 walkthrough.
3. Keep `.env`, session cookies, and raw credentials off-screen.

---

## 2. Minute-by-Minute 60-Minute Schedule

### Segment 1 (`00:00–05:00`) — Enterprise Business Context & Production Incident
- **Slides:** `#/start`, `#/trust`, `#/invariant`
- **Browser:** Open `http://127.0.0.1:3000` showing `CC-ENG-01` (*Platform Engineering Q4*: `$10,000.00` allocated, `$0.00` committed) and the two `$7,000.00` `PENDING` requests (*Cloud Security Audit Tooling* and *CI Runner Capacity Expansion*).
- **Narrative:** Frame the reviewer's question: *"What evidence would you demand before approving an agent-written PR touching financial budgets?"* Introduce `PH-42` (`$7k + $7k` concurrently against `$10k`) and `INV-01`–`INV-10`.

### Segment 2 (`05:00–12:00`) — Trust Pyramid & Enforceable Architecture (Pillar 01)
- **Slides:** `#/trust-pyramid`, `#/procurement-hub`, `#/boundaries`
- **Live Terminal Command (1 min):**

```bash
bun run verify:architecture
```

- **Expected Output:** JSON `"status": "pass"` showing ESLint rejecting 5 real violations (`domain` importing `drizzle-orm`, `domain` using `Number.parseFloat`, `application` importing `infrastructure`, `infrastructure` importing `next/headers`, UI importing `lab-database`).
- **Key Takeaway:** Move recurring agent corrections down the Trust Pyramid — from `AGENTS.md` prose into types, ESLint rules, and PostgreSQL constraints.

### Segment 3 (`12:00–20:00`) — Verification Harness, Feature Maps & Reusable Skills (Pillar 02)
- **Slides:** `#/boot-lab`, `#/try-the-app`
- **Files to flash briefly (2 min):** `skills/verify-procurement/SKILL.md` and `skills/verify-procurement/features/README.md` (8 feature maps).
- **Live Terminal Commands (2 min):**

```bash
bun run lab:doctor
bun run ph42:reproduce
```

- **Expected Failure Output on `workshop/starter`:**
  - Exit code **`1`**
  - `httpStatuses: [200, 200]`
  - `after.committedBudgetMinor: 1400000`, `after.availableBudgetMinor: -400000`
  - `violatedInvariants: ["INV-01", "INV-02"]`
- **Browser Proof (1 min):** Refresh `http://127.0.0.1:3000` -> point directly at `CC-ENG-01` showing **`$14,000.00`** committed and **`-$4,000.00 (OVERSPENT)`** in red!
- **Time check:** Must reach Segment 4 by **20:00**!

### Segment 4 (`20:00–40:00`) — Live GrokBot Investigation, Implementation & Verification Loop (Pillar 03)
- **Slides:** `#/runtime`, `#/reproduce`, `#/agent-loop`, `#/verify-live`
- **Initialize Bounded Loop (optional 30s visual):**

```bash
bun engineering/loop-runner.ts init --run-id live-demo --issue PH-42 --max-iterations 3 --max-consecutive-failures 2
```

- **Exact Prompt to Submit to GrokBot:**

> Investigate PH-42 in this isolated Procurement Hub lab checkout. Read `AGENTS.md`, `doc-specs/03-demo-issue-42.md`, `SPEC.md`, and `skills/verify-procurement/SKILL.md`. Reproduce the concurrent approval overspend with `bun run ph42:reproduce`, state your root-cause hypothesis across PostgreSQL locking, DB constraints, and approval idempotency (`INV-01`–`INV-10`), implement the minimal targeted fix preserving all ESLint boundaries, and verify with `bun run check:static`, `bun run ph42:reproduce`, `bun run test:concurrency`, and `bun run test:security`. Allow at most 2 self-correction attempts; never weaken tests or ESLint rules; leave merge to the human reviewer.

- **What Audience Must Observe (20–38 min):**
  1. Agent reproduces the `$14,000 > $10,000` failure live.
  2. Agent diagnoses TOCTOU read-then-check-then-update without `SELECT ... FOR UPDATE`, missing `CHECK (committed_budget_minor <= allocated_budget_minor)`, missing `UNIQUE (tenant_id, request_id)` on `financial_commitments`, and missing `decision_idempotency_keys` + auth-before-replay.
  3. Agent applies migration `0003` + ACID `decide()` fix.
  4. Agent (or facilitator) runs:

```bash
bun run lab:reset && bun run lab:init
bun run check:static
bun run ph42:reproduce
bun run test:concurrency
bun run test:security
```

- **Expected Successful Output:**
  - `ph42:reproduce` exits **`0`**: `httpStatuses: [200, 409]` (`INSUFFICIENT_BUDGET`), `committedBudgetMinor: 700000`, `availableBudgetMinor: 300000`, `commitmentsCount: 1`, `approvedAuditCount: 1`, `violatedInvariants: []`.
  - `test:concurrency` passes (including 6-way `$3k` burst and concurrent same-key retries).
  - `test:security` passes (cross-tenant `404`, junior limit `403`, revoked-role replay `403`).
- **Hard Timebox Guard (`35:00`):** If live GrokBot generation stalls or exceeds 15 minutes, transparently switch to recovery checkpoint `checkpoint-03-implementation` or `checkpoint-04-runtime-verified` and run the verification commands live so the audience still sees real PostgreSQL proof!

### Segment 5 (`40:00–48:00`) — Independent Quality Gates, Evidence & PR Governance (Pillar 04)
- **Slides:** `#/run-harness`, `#/review`
- **Live Terminal / Browser:**
  - Show `artifacts/verification/solution/<run-id>/summary.md` (emphasize exact Git SHA, `worktreeDirty: false`, 14 checks, before/after DB snapshots, Playwright screenshots retained after cleanup).
  - Show `.github/workflows/workshop-verification.yml` (6 split least-privilege jobs + `governance-guard` flagging edits to protected criteria/tests/ESLint).
  - Show `.github/pull_request_template.md` (11 sections + Human Approval Checklist).
  - Explicitly distinguish committed workflows from administrative GitHub Branch Rulesets (`docs/governance/ENTERPRISE-GOVERNANCE.md`).

### Segment 6 (`48:00–53:00`) — Prepared Formal Verification Demonstration (5 Minutes)
- **Slides:** `#/formal-verification`
- **Live Terminal Command (runs in ~4 seconds with cached Docker image & JAR):**

```bash
bun run verify:formal --run-id live-tlc
```

- **Show `artifacts/formal/live-tlc/summary.md`:**
  1. `defective-read-commit.cfg`: exit **`12`**, 7-step counterexample (`StartApproval -> StartApproval -> ReadBudgetUnserialized -> ReadBudgetUnserialized -> CommitUnserialized -> CommitUnserialized`) violating `BudgetNotExceeded`.
  2. `locked-atomic.cfg`: exit **`0`**, `473` generated / `225` distinct states, `0` left on queue, all 6 invariants verified including `LoseResponseAndRetry`.
- **Honest Framing:** Explicitly state that `fast-check` is NOT formal verification, and bounded TLA+ checks the model — not the full TypeScript runtime.

### Segment 7 (`53:00–60:00`) — Reusable Enterprise Starter Kit & Q&A
- **Slides:** `#/takeaways`, `#/questions`
- Point attendees to `starter-kit/` (12 reusable templates + `BROWNFIELD-ADOPTION-GUIDE.md`) and `docs/workshop/PARTICIPANT-GUIDE.md`.
- Facilitate Q&A on incremental enterprise adoption.

---

## 3. Recovery Checkpoints (Instant Live Safety Net)

| Tag | State | When to Use |
| --- | --- | --- |
| `checkpoint-00-starter` | Clean runnable `workshop/starter` with PH-42 defect | Reset if demo DB or working tree gets messy before Segment 3 |
| `checkpoint-01-reproduced` | Starter + recorded PH-42 reproduction context | Jump straight to investigation if reproduction command stalls |
| `checkpoint-02-harness-ready` | Verified harness, 8 feature maps, loop runner | Jump to live implementation segment |
| `checkpoint-03-implementation` | Complete ACID reference fix + migration `0003` applied | Jump straight to runtime/concurrency verification if GrokBot times out at 35:00 |
| `checkpoint-04-runtime-verified` | Solution + full test suites + formal TLC verified | Jump straight to Pillar 04 evidence & PR governance |
| `checkpoint-05-pr-ready` | Complete `workshop/solution` + CI/PR governance + guides | Final showcase & Q&A |

---

## 4. Fallback Matrix & Risk Mitigation

| Risk | Signal | Immediate Action |
| --- | --- | --- |
| GrokBot API latency or outage | >3 min wait or auth error | Announce switch to manual/terminal walkthrough; inspect `checkpoint-03-implementation` diff and run all verification scripts live. |
| Docker Desktop stalls during session | `lab:doctor` exits `2` | Switch to pre-captured rehearsal evidence (`artifacts/verification/solution/<rehearsal-id>/summary.md`), clearly stating original date and commit SHA. |
| Live session running behind at 45:00 | Less than 15 min remaining | Keep Pillar 04 PR governance + Q&A intact; show pre-verified `artifacts/formal/` summary instead of live TLC execution. |
| Network outage during `verify:formal` | Cannot download `tla2tools.jar` | Pre-cache `artifacts/.cache/tla2tools-1.7.4.jar` and `eclipse-temurin:21-jre-alpine` before session starts. |

## 5. Post-Session Cleanup

1. Stop `bun run dev` (`Ctrl+C`) and run `bun run lab:down`.
2. Verify no private notes, `.env`, or raw traces were committed.
3. Share only approved participant-safe refs (`workshop/starter`, `workshop/guided`, `workshop/solution`, `PARTICIPANT-GUIDE.md`, and `starter-kit/`).
