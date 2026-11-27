# Reusable Enterprise Agentic Engineering Starter Kit

Procurement Hub is the reference implementation; **this starter kit is the portable engineering system** you can adapt incrementally to your own brownfield enterprise repositories.

## Start Here

Read **[BROWNFIELD-ADOPTION-GUIDE.md](BROWNFIELD-ADOPTION-GUIDE.md)** for a pragmatic, 4-stage rollout plan that requires **zero** greenfield rewrites.

## Included Templates (12 Reusable Patterns)

| # | Template | Trust Pyramid Layer | Purpose |
| --- | --- | --- | --- |
| 01 | [01-agent-friendly-architecture-checklist.md](01-agent-friendly-architecture-checklist.md) | Layer 01 · Codebase | Audit & harden module boundaries, exact types, and DB invariants |
| 02 | [02-AGENTS.template.md](02-AGENTS.template.md) | Layer 05 · Prose | Concise routing-first `AGENTS.md` (constraints live in code, not prose) |
| 03 | [03-feature-map.template.md](03-feature-map.template.md) | Layer 03 · Runtime | User-POV feature map guiding agents to real journeys and invariants |
| 04 | [04-verification-skill.template.md](04-verification-skill.template.md) | Layer 03 · Runtime | Portable `verify-<app>/SKILL.md` (Launch, Doctor, Drive, Evidence, Cleanup) |
| 05 | [05-engineering-harness.template.ts](05-engineering-harness.template.ts) | Layer 03 · Runtime | Minimal TypeScript lifecycle harness with SHA-bound manifest & cleanup |
| 06 | [06-formal-verification.template.tla](06-formal-verification.template.tla) | Layer 04 · Formal | Starter TLA+ safety model contrasting unserialized vs atomic transitions |
| 07 | [07-loop-engineering-playbook.md](07-loop-engineering-playbook.md) | Workflow | 12-stage bounded self-correcting loop with anti-spin & scope guards |
| 08 | [08-handoff.template.md](08-handoff.template.md) | Workflow | Persistent cross-context handoff artifact for fresh agent sessions |
| 09 | [09-verification-evidence.schema.json](09-verification-evidence.schema.json) | Layer 04 / Governance | Machine-readable JSON Schema for revision-bound evidence manifests |
| 10 | [10-independent-quality-gates.workflow.yml](10-independent-quality-gates.workflow.yml) | Governance | Least-privilege multi-job GitHub Actions gates + protected-file guard |
| 11 | [11-pull-request.template.md](11-pull-request.template.md) | Governance | 11-section enterprise PR template with Human Approval Checklist |
| 12 | [12-enterprise-governance-checklist.md](12-enterprise-governance-checklist.md) | Governance | Administrative branch ruleset, credential scoping, and audit checklist |
