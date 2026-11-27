# Map: Procurement Hub experience transformation

## Destination

An approved enterprise product experience specification (PH-UXS-001), supported by interactive prototypes, a design system, role-specific journeys and an implementation-ready verification plan.

## Notes

- Conventions: [Wayfinder local tracker](../../docs/workflows/WAYFINDER-LOCAL-TRACKER.md). Approved plan: [TRANSFORMATION-PLAN](../../docs/experience/TRANSFORMATION-PLAN.md). Draft spec: [EXPERIENCE-SPEC](../../docs/experience/EXPERIENCE-SPEC.md).
- Read skills by explicit path and record their SHA-256 in each ticket answer: `.agents/skills/{wayfinder,grilling,research,prototype,domain-modeling,ui-taste,web-design-guidelines,ui-ux-pro-max}`.
- Authorities: `PRD.md` (INV-01 to INV-10, AC-01 to AC-12), `SPEC.md`, `docs/domain/GLOSSARY.md`. This map never weakens them.
- Synthetic lab only. Publish nothing and push nothing. Decisions belong to the human.
- Setup decisions already taken (2026-11-27): docs relocation WIP stashed (`stash@{0}`); npm lockfile and `ui-ux-pro-max` bytecode removed; Wayfinder, Prototype, Grilling and Research reinstalled through the pinned lock; `.scratch/` tracked and excluded from every edition.

## Decisions so far

## Not yet specified

- Dark mode after v1.
- Print and export of decisions or audit trails.
- A durable business reference (`PR-YYYY-NNNN`) ADR, if "Human-readable identifiers" asks for one.
- Mobile-first approval flows beyond responsive parity.
- Locale-aware formatting beyond USD and UTC.

## Out of scope

- Production authentication or single sign-on.
- New write capabilities: budget editing, delegation, multi-step approvals, escalation routing.
- Notifications, activity feeds not backed by audit events, forecasts and trend charts.
- Multi-currency, schema migrations, publishing issues, pushing branches.
