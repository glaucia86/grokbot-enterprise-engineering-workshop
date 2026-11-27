# 07 — Bounded Loop Engineering Playbook Template

## Twelve-Stage Execution Loop
1. **Context acquisition** -> read `AGENTS.md`, spec, glossary, prior handoff.
2. **Issue comprehension** -> state invariants, ACs, and smallest sufficient scope.
3. **Failure reproduction** -> run real failing check before changing code.
4. **Root-cause investigation** -> trace to first violated boundary.
5. **Hypothesis formulation** -> write falsifiable cause + fix hypothesis.
6. **Minimal targeted implementation** -> model types & DB constraints before logic.
7. **Deterministic verification** -> static, architecture, unit, integration, security, properties.
8. **Runtime verification** -> live app, DB, browser skill (`verify-<app>`).
9. **Evidence collection** -> clean-SHA `manifest.json` + `summary.md` surviving cleanup.
10. **Independent review** -> `clean-code`, `code-review-and-quality`, adversarial QA/Security falsification.
11. **Bounded self-correction** -> change hypothesis/code before re-running; **attack the premise** after 2 failures sharing one assumption.
12. **Completion or escalation** -> persist `handoff.md` and open PR for human review.

## Hard Budgets
- **Max iterations:** `3` (1 initial + 2 self-corrections).
- **Max consecutive failures:** `2`.
- **Execution time cap:** `<e.g., 15 minutes>`.
- **Anti-spin rule:** Refuse to re-run an identical failing command with unchanged hypothesis and code diff.
- **Scope-expansion guard:** Escalate immediately if changes touch protected tests, lint boundaries, specs, or CI workflows.
