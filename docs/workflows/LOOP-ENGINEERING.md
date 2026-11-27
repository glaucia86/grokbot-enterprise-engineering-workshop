# Bounded Loop Engineering Playbook

A reusable, bounded self-correcting engineering loop inspired by Lauren Tan's **Poteto Mode** (`pstack`) and adapted as an agent-independent TypeScript engine (`engineering/loop-runner.ts`).

---

## 1. The 12-Stage Bounded Loop

Every non-trivial investigation or vertical slice executes through these explicit stages:

1. **Context Acquisition** — Load `AGENTS.md`, `PRD.md`, `SPEC.md`, `docs/domain/GLOSSARY.md`, and the active slice/handoff. Inspect `git status` and `git rev-parse HEAD`.
2. **Issue Comprehension** — Restate the target invariants (`INV-01`–`INV-10`), acceptance criteria (`AC-*`), and smallest sufficient scope.
3. **Failure Reproduction** — Execute the live failing check (`bun run ph42:reproduce`) against the real app and PostgreSQL. Record exact failure output and DB snapshot before editing code.
4. **Root-Cause Investigation** — Trace the failure across HTTP -> application -> domain -> persistence -> database constraints. Identify the first place the invariant breaks.
5. **Hypothesis Formulation** — Write a falsifiable hypothesis explaining *why* the defect occurs and *what* minimal change fixes the root cause (recorded in `artifacts/loop/<run-id>/state.json`).
6. **Minimal Targeted Implementation** — Model data shape and constraints first (`domain/`, migrations, `infrastructure/`). Avoid unrelated refactors.
7. **Deterministic Verification** — Run Layer 2 gates: `check:static`, `verify:architecture`, `test:unit`, `test:integration`, `test:concurrency`, `test:security`, `test:properties`.
8. **Runtime Verification** — Execute Layer 3 skill (`skills/verify-procurement/SKILL.md` / `bun run verify:all`) against live Next.js, real PostgreSQL 18, and Playwright Chromium.
9. **Evidence Collection** — Confirm `artifacts/verification/<run-id>/manifest.json` and `summary.md` bind exact clean SHA, DB snapshots, HTTP transcripts, screenshots, and seeds, and survive cleanup.
10. **Independent Review** — Apply `clean-code`, `code-review-and-quality`, and Security/QA falsification checklists (`docs/agents/AGENT-ROLES.md`) from a fresh context.
11. **Bounded Self-Correction** — If a check or review finds a real defect, form a **new** hypothesis, apply a targeted fix, and re-run affected checks within the configured budget. **Attack the premise** if two fixes sharing the same assumption fail the same gate.
12. **Completion or Escalation** — When all exit criteria pass on a clean revision, generate `handoff.md` and open a PR for human review. When any budget or guardrail trips, **stop immediately**, persist `handoff.md`, and escalate to a human engineer.

---

## 2. Configurable Guardrails & Stopping Conditions (`engineering/loop-runner.ts`)

| Guardrail | Default Limit | Enforcement Behavior |
| --- | --- | --- |
| **Max iterations** | `3` (initial attempt + 2 self-corrections) | Hard stop with `status: "escalated"` once reached; exit code `2`. |
| **Max consecutive failures** | `2` | Forces root-cause premise check and human escalation (`exit 2`). |
| **Execution time budget** | `900` seconds (15 min live demo cap) | Rejects new iterations once wall-clock budget expires (`exit 2`). |
| **Anti-spin hypothesis guard** | Mandatory unique `(command, hypothesis, diffHash)` | **Refuses** (`exit 2`) to re-run the same failing command with the same hypothesis and unchanged code diff. |
| **Scope-expansion guard** | Protected paths allowlist | Inspects `git diff --name-only` and flags/blocks unauthorized edits to `eslint.config.ts`, `.github/workflows/`, `PRD.md`, `engineering/slice-checks.json`, `tests/concurrency/`, `tests/security/`. |
| **Human escalation** | Mandatory on any blocker/scope/security conflict | Persists full context to `artifacts/loop/<run-id>/handoff.md` and stops. |

---

## 3. CLI Usage (Persisted State Outside Conversation Context)

```bash
# 1. Initialize a bounded loop session
bun engineering/loop-runner.ts init --run-id ph42-demo --issue PH-42 --max-iterations 3 --max-consecutive-failures 2 --time-budget-seconds 900

# 2. Record a hypothesis and execute a bounded verification command
bun run loop:run -- --run-id ph42-demo --stage reproduce --hypothesis "Concurrent approvals read stale committed_budget_minor without row lock" --cmd "bun run ph42:reproduce"

# 3. Inspect persisted loop state and resume handoff (usable in a fresh context window)
bun run loop:status -- --run-id ph42-demo
```

State persists under `artifacts/loop/<run-id>/`:
- `state.json` — Complete machine-readable ledger (budgets, elapsed time, iterations, hypotheses, diff hashes, exit codes, escalation status).
- `handoff.md` — Compact human/agent resume brief (changed files, decisions, unresolved issues, verification results, candidate SHA, and exact next executable step).

---

## 4. Pre-Completion Slice Quality Gate

Before marking any vertical slice complete, execute and record:
1. Relevant verification skill (`verify-procurement` and, when touching approval concurrency, `verify-formal-approval`).
2. `clean-code` readability & responsibility review.
3. `code-review-and-quality` multi-axis review (correctness, security, maintainability, performance).
4. Re-run every check impacted by review fixes on a clean Git worktree.
5. Persist final `handoff.md` and evidence paths. Never mark a slice complete while required evidence is missing.
