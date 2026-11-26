# Slice execution and review

Use the [ticket index](TICKETS.md) to select one eligible slice. Read the linked acceptance criteria, architecture boundaries and previous handoff, then load the skills that apply. Verify the branch, working tree and baseline before changing files. A code slice starts with an observable failing check for its behavior and ends with runnable evidence and a reviewable candidate.

1. Record the baseline. Reproduce a reported defect in the disposable lab. Use the public HTTP/UI or command interface and prove persisted invariants where relevant.
2. Work red → green → refactor in small steps. For a failing run, record the root cause and correct the current slice only. Keep the same run ID through the initial attempt and up to two corrections. Escalate once the budget is exhausted.
3. Exercise the runtime behavior on the real app, database and browser where the ticket requires them. Review the candidate with `clean-code` and `code-review-and-quality`, fix applicable findings and rerun checks.
4. Run final checks against a clean candidate. Record `pass`, `fail`, `blocked` and `not-run` explicitly. Retain sanitized evidence and write a [handoff](handoffs/TEMPLATE.md). Request human review through the PR. For acceptance requiring V-06, also link independent CI.
5. Open a fresh session for the next slice only after human approval of the current slice. Give it the handoff prompt and scoped pointers. If the current tool cannot open another session, use the persisted handoff as the session entry point.

## Executable checks

Install the project-local skills first. Run the configured preparation checks from the repository root with the pinned Bun runtime.

```bash
bun engineering/bootstrap-skills.ts
bun engineering/bootstrap-skills.ts --verify
bun engineering/check-slice.ts PREP preparation
```

Add check commands to `engineering/slice-checks.json` as they are implemented. Each command is an argument array with a time limit. Commands come from that tracked file. Use short-lived commands or helpers that own and clean up any processes they start.

The runner writes one immutable attempt directory under `artifacts/verification/<slice>/<run-id>/`, with the candidate SHA, worktree status, versions, exit codes, durations and logs. Exit 0 means the checks passed on a clean worktree, 1 means a failure, blocker or dirty worktree, and 2 means the invocation was rejected. An interrupted attempt requires inspection before a new run. Logs remain local until reviewed for sensitive content. `humanReview: pending` is recorded even when all checks pass. Human approval comes from the repository review process.

## Prompt for a fresh slice session

> Implement only **[slice ID]** on **[branch]**, based on **[candidate SHA]**. Read AGENTS.md, the matching ticket, its acceptance criteria and **[prior handoff path]**. Verify the working tree and the review gate before starting. Follow the slice execution loop. Leave a candidate and a handoff with check outcomes, evidence paths, blockers and a resume prompt. Stop before moving to another slice.

## Agent and pstack portability

Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/41e400932eca14f289e7db717a70455256b6d388/pstack) supplies the verification and work-sequencing principles. The original generators target Cursor and have platform-specific discovery, commands and conventions. This repository adapts their engineering contracts in its own files.

| Principle | Procurement Hub implementation |
| --- | --- |
| Prove behavior, work in verifiable units and fix root causes | Ticket-scoped acceptance criteria, red-to-green checks, bounded corrections and a machine-readable manifest |
| Encode lessons in structure, model the domain and protect boundaries | Domain model and module boundaries in the spec, progressively backed by architecture and runtime checks |
| Keep context scoped | One slice per fresh session, directed reads from AGENTS.md and handoffs that refer to evidence instead of repeating it |
| Make operations idempotent | Track logical intents, actor binding and committed state as product invariants. Verify through the application and database. |
| Create and maintain a verification skill | VS-00 verifies the launch path. VS-04 adds exact launch, doctor, drive, evidence and cleanup commands and aligns a feature map with the runnable app. Drive affected features whenever their behavior changes. |
| Formal verification | VS-07 may add a separate model checker entry point with documented bounds and actual results. |

Codex can discover project-local skill manifests in a trusted workspace. The repository stores a pinned installer and lock, while the downloaded files are local to each checkout. The bootstrap verifies bytes and installs no global skill or supporting tooling. The [skill inventory](SKILLS.md) describes scope, sources and audit notes. Terminal commands are the agent-independent interface. GrokBot registration, permission enforcement and independent skill execution remain capability checks.
