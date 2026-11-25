# Procurement Hub — workshop specification pack

**Status:** v0.2 · proposed specification pack · 2026-11-25
**Event:** Packt Advanced GrokBot Workshop · December 11, 2026 · 60 minutes  
**Session:** GrokBot for Enterprise Engineering Workflows: From Issue to Verified Pull Request

This pack defines the product, architecture, demo issue, verification contracts and implementation sequence. Check the relevant handoff for the current implementation and verification status.

## Read in order

This is the private authoring specification pack. It includes instructor-only material. Before releasing the participant starter, build a spoiler-free history and exclude instructor-only decisions; deleting files from a public branch tip does not remove them from Git history.

| Document | Purpose |
| --- | --- |
| [01 — Product requirements](01-product-requirements.md) | Scope, users, workflows, business rules, acceptance criteria |
| [02 — Technical architecture](02-technical-architecture.md) | Domain, data model, API contracts, trust boundaries, stack |
| [03 — Demo issue](03-demo-issue-42.md) | Participant-facing bug specification; ready to turn into a GitHub issue |
| [04 — Verification strategy](04-verification-strategy.md) | Evidence, harness, deterministic checks, CI and limits |
| [05 — Vertical slices and repository plan](05-vertical-slices.md) | Build sequence, checkpoints, release criteria, demo contingency |
| [06 — Engineering guardrails](06-engineering-guardrails.md) | Agent permissions, planned enforceable controls, evidence and stop conditions |
| [Domain model](DOMAIN-MODEL.md) | Shared terms, state transitions and invariants |
| [Implementation tickets](TICKETS.md) | Outcomes, dependencies and requirements traceability |
| [Slice execution and review](LOOP-ENGINEERING.md) | Loop, executable checks, approvals and handoffs |
| [Skill inventory](SKILLS.md) | Pinned sources, install and audit notes |
| [ADR-0001](adr/0001-idempotency-reference-solution.md) | Instructor/reference solution decision; keep out of the starter branch |

## Core workshop promise

Participants learn to construct an environment in which a coding agent can exercise a real application, detect and fix a regression, and produce independently reviewable evidence. Procurement Hub is a small synthetic enterprise case, not a production-certified procurement or identity platform.

## Scope controls

- One primary bug: concurrent submissions with the same idempotency key.
- Core lab: Next.js, TypeScript, PostgreSQL, test/verification scripts and independently executed CI.
- Advanced extension: property-based testing and a prepared TLA+ model. Formal verification is optional for the live hour.
- GrokBot compatibility is an integration spike; no native pstack compatibility is assumed.
- UI, presentation, bilingual talk track and public starter kit are subsequent deliverables.

## Attribution

Inspired by Lauren Tan's [AI Engineer talk](https://www.youtube.com/watch?v=O_zcc6Xl12g) and [pstack](https://github.com/cursor/plugins/tree/main/pstack), particularly [create-verification-skill](https://github.com/cursor/plugins/blob/main/pstack/skills/create-verification-skill/SKILL.md). The product, scope and governance design here are workshop-specific adaptations. If any substantial portions of pstack are copied or adapted, retain its [MIT copyright and license notice](https://github.com/cursor/plugins/blob/main/pstack/LICENSE) and pin the source revision when importing.
