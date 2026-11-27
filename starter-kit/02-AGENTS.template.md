# AGENTS.md Template — Context-Routing & Trust Pyramid First

> Replace `<placeholders>` with real paths and commands in your repository. Delete any line that does not correspond to an executable file or script.

## Mission & Scope
- System: `<Application Name>` (`<Domain / Purpose>`)
- Runtime & toolchain: `<Pinned Runtime & Package Manager>`
- Non-production rule: Use synthetic data and isolated local/staging sandboxes only.

## Context Routing (Load Only What Applies)
| Task | Read |
| --- | --- |
| Requirements & acceptance criteria | `PRD.md` |
| Architecture, schema & API contracts | `SPEC.md` |
| Domain vocabulary | `docs/domain/GLOSSARY.md` |
| Runtime verification & Feature Maps | `skills/verify-<app>/SKILL.md` |
| Formal verification (if applicable) | `formal/README.md` |

## Enforceable Controls (Never Rely on Prose Alone)
1. **Static & Architecture:** `<e.g., bun run check:static && bun run verify:architecture>`
2. **Deterministic Tests:** `<e.g., bun run test:unit && bun run test:integration && bun run test:security>`
3. **Runtime Proof:** `<e.g., bun run verify:all --run-id <id>>`
4. **Formal Check (bounded protocol):** `<e.g., bun run verify:formal>`

## Execution & Governance Boundaries
- Reproduce defects against the real app and database before editing code.
- Work in small, independently verifiable vertical slices on scoped branches.
- Stop after `<N>` self-correction attempts; never repeat an identical failing command without changing your hypothesis or diff.
- Never weaken tests, lint boundaries, acceptance criteria, or CI workflows to force a green run.
- Never commit secrets/PII, force-push shared branches, deploy, or approve/merge your own PR.
