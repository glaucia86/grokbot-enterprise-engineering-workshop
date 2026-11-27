# Skill Inventory, Provenance & Execution Audit

This inventory documents all 28 pinned third-party skills installed via `engineering/skills-lock.json` (`bun engineering/bootstrap-skills.ts --verify`) plus the repository-local verification skills authored for Procurement Hub.

> **Security & Supply-Chain Policy:** No unreviewed forks or external install scripts were added during this transformation. All 28 third-party skills are verified offline byte-for-byte against their SHA-256 digests in `engineering/skills-lock.json`. Skills that assume external issue publishing (e.g., `to-prd`, `to-spec`, `to-tickets`, `implement-spec`) are adapted strictly to local repository artifacts.

---

## 1. Repository-Local Workshop Skills (Authored for Procurement Hub)

| Skill | Path | Purpose | Basis / Attribution | Execution Status |
| --- | --- | --- | --- | --- |
| `verify-procurement` | `skills/verify-procurement/SKILL.md` (+ 8 feature maps in `features/`) | Launch, Doctor, Drive, Evidence, Cleanup, and Helpers for isolated Procurement Hub runtime verification | Independent adaptation of `pstack`'s `create-verification-skill` (MIT) | Executed end-to-end in Phase 04 & Phase 10 |
| `verify-formal-approval` | `skills/verify-formal-approval/SKILL.md` | Bounded TLA+/TLC model checking of concurrent financial approval invariants (`ProcurementApproval.tla`) | Independent adaptation of `pstack`'s `create-formal-verification-skill` (MIT) | Executed end-to-end in Phase 06 & Phase 10 |

---

## 2. Installed Pinned Third-Party Skills (`.agents/skills/` via `engineering/skills-lock.json`)

All 28 packages passed `bun engineering/bootstrap-skills.ts --verify` on 2026-11-27 (UX-VS-00). The original 24 passed on 2026-11-26.

| Skill | Upstream Source | Pinned Revision | License | Audit Status | Compatibility & Local Adaptation | Applied in Transformation? |
| --- | --- | --- | --- | --- | --- | --- |
| `to-prd` | `mattpocock/skills` | `3832253f` | MIT | Verified SHA-256 | Adapted to local `PRD.md` (no external tracker publish) | **Yes** — read & applied to `PRD.md` structure & test seams (Phase 02) |
| `to-spec` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Adapted to local `SPEC.md` (no external tracker publish) | **Yes** — read & applied to `SPEC.md` implementation & testing contracts (Phase 02) |
| `to-tickets` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Adapted to local `docs/architecture/VERTICAL-SLICES.md` DAG | **Yes** — read & applied tracer-bullet vertical slicing + blocking edges (Phase 02) |
| `implement-spec` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Adapted to single scoped branch + persisted handoffs (no tracker mutations) | **Yes** — read & applied frontier sequencing and scoped pointers (Phases 02–06) |
| `domain-modeling` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Native format applied directly (`GLOSSARY-FORMAT.md`, `ADR-FORMAT.md`) | **Yes** — invoked & applied to `docs/domain/GLOSSARY.md` and `docs/adr/` (Phase 01–02) |
| `tdd` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Applied seam-first, behavior-oriented red-to-green discipline | **Yes** — invoked & applied to failing-first concurrency/domain tests (Phases 03, 06) |
| `handoff` | `mattpocock/skills` | `6f7f7831` | MIT | Verified SHA-256 | Adapted to persist handoffs under `artifacts/loop/` and `docs/assessment/TRANSFORMATION-LOG.md` | **Yes** — read & applied to loop handoff format (Phase 05) |
| `typescript-advanced-types` | `wshobson/agents` | `c96b5f65` | MIT | Verified SHA-256 | Native TypeScript 5.9 strict | **Yes** — applied to branded `MoneyMinor`, discriminated result unions (Phase 03, 06) |
| `vercel-react-best-practices` | `vercel-labs/agent-skills` | `5a37a632` | MIT (manifest) | Verified SHA-256 | Next.js 16 App Router Server Components + parallel server fetching | **Yes** — applied to Server Component data loading in `src/app/` (Phase 03) |
| `zod` | `pproenca/dot-skills` | `cf93c57c` | MIT | Verified SHA-256 | Zod v4 (`z.strictObject`, `safeParse`, discriminated unions) | **Yes** — applied to HTTP input validation schemas (Phase 03, 06) |
| `postgresql-optimization` | `github/awesome-copilot` | `93fc8b9e` | MIT | Verified SHA-256 | PostgreSQL 18 locking, composite indexes, CHECK constraints | **Yes** — applied to `FOR UPDATE` row locking & composite indexes (Phase 06) |
| `postgresql-code-review` | `github/awesome-copilot` | `93fc8b9e` | MIT | Verified SHA-256 | PostgreSQL 18 DDL/transaction safety review | **Yes** — applied during Phase 06–07 migration & transaction review |
| `drizzle` | `lobehub/lobehub` | `f34569cb` | LobeHub Community License | Verified SHA-256 | Authoring-only reference (excluded from public starter packaging due to license) | **Reference only** — consulted for schema/table constraints |
| `multi-stage-dockerfile` | `github/awesome-copilot` | `93fc8b9e` | MIT | Verified SHA-256 | Not required (app runs locally / Compose DB) | **Not executed** — no production app Dockerfile in scope |
| `docker-patterns` | `affaan-m/ECC` | `4adeee67` | MIT | Verified SHA-256 | Applied only to owned disposable lab containers (never global prune) | **Yes** — applied to disposable Compose & Dockerized TLC execution (Phase 04, 06) |
| `docker-compose-patterns` | `docker/skills` | `fbcef37a` | Apache-2.0 | Verified SHA-256 | Compose v2 healthchecks and isolated project names | **Yes** — applied to `compose.yaml` & isolated harness lifecycle |
| `vitest` | `antfu/skills` | `4a6bb39e` | MIT | Verified SHA-256 | Vitest on Bun 1.4.5 runtime (`vitest.config.ts`) | **Yes** — invoked & applied to Vitest migration & suite configuration (Phase 03, 06) |
| `playwright-cli` | `microsoft/playwright-cli` | `dc5f4d56` | Apache-2.0 | Verified SHA-256 | Playwright `@playwright/test` + Chromium traces/screenshots | **Yes** — applied to E2E tests and screenshot evidence capture (Phase 06) |
| `web-design-guidelines` | `vercel-labs/agent-skills` | `5a37a632` | Upstream license unconfirmed | Verified SHA-256 | Authoring-only (excluded from public starter packaging pending license confirmation) | **Yes** — applied for semantic accessible labels/tables in Procurement Hub UI |
| `ui-taste` | `uizze.sh` | `uizze-design-v14` | Apache-2.0 | Verified publisher checksums | Offline reference only; optional external Uizze services unused | **Reference only** — visual hierarchy & clean financial UI craft |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | `bde080f4` | MIT | Verified SHA-256 | Static reference. Its bundled Python helpers were executed during the local `feat/ui-ledger-indigo` redesign; the generated `scripts/__pycache__` failed `--verify` and was removed on 2026-11-27. Read its data files directly; run a helper only with explicit approval and `PYTHONDONTWRITEBYTECODE=1`. | **Reference only** — financial dashboard readability |
| `github-actions-templates` | `wshobson/agents` | `c96b5f65` | MIT | Verified SHA-256 | Scoped strictly to lab CI gates with SHA-pinned actions & `contents: read` | **Yes** — applied to multi-job CI workflow (Phase 07) |
| `clean-code` | `sickn33/agentic-awesome-skills` | `166f581c` | CC BY 4.0 / MIT | Verified SHA-256 | Adapted to TypeScript/repository conventions | **Yes** — invoked & applied across code slices and Phase 07 review |
| `code-review-and-quality` | `addyosmani/agent-skills` | `e997ac5b` | MIT | Verified SHA-256 | Full multi-axis review checklist (correctness, security, maintainability) | **Yes** — invoked & applied during Phase 07 independent review |
| `wayfinder` | `mattpocock/skills` | `7739eaed` | MIT | Verified SHA-256 | User-invoked only. Local Markdown map under `.scratch/` ([tracker conventions](../workflows/WAYFINDER-LOCAL-TRACKER.md)); no issue publishing, no pushed research branches | **Yes** — UX transformation decision map (UX-VS-00) |
| `prototype` | `mattpocock/skills` | `32165827` | MIT | Verified SHA-256 | Read-only variants on a local throwaway branch; never merged or packaged | **Planned** — UX prototype phase |
| `grilling` | `mattpocock/skills` | `7739eaed` | MIT | Verified SHA-256 | Wayfinder dependency for HITL decision tickets | **Planned** — UX decision tickets |
| `research` | `mattpocock/skills` | `7739eaed` | MIT | Verified SHA-256 | Wayfinder dependency; findings saved under `.scratch/<effort>/research/` | **Planned** — UX research tickets |

---

Each new pin is the latest upstream commit that changed the skill and is at least seven days old; its bytes equal the 2026-11-25 `6f7f7831` snapshot. An earlier CLI installation (CRLF copies plus a root `skills-lock.json`) was replaced by this audited installation.

### Discovery

Devin lists packages from `.agents/skills/` in its skill registry, but `wayfinder` stays hidden because it sets `disable-model-invocation: true`. Repository-local `skills/verify-*` are not discovered and must be read by path. A user-global skill with the same name can shadow a pinned copy: a global `to-prd` did so on 2026-11-27. Slice handoffs therefore list every skill file read, by path and SHA-256.

## 3. Redistribution & Packaging Guardrails

- `drizzle` (LobeHub Community License) and `web-design-guidelines` (unconfirmed license) remain **outside** `workshop/starter`, `workshop/guided`, and `workshop/solution` release packaging.
- `.scratch/` (Wayfinder maps and tickets) and `.agents/` are authoring-only and excluded from every edition by `engineering/package-workshop.ts`.
- `.agents/skills/` stays gitignored (`.agents/skills/.gitignore`); only `engineering/skills-lock.json` and `engineering/bootstrap-skills.ts` are tracked in authoring branches.
- Repository-local workshop skills (`skills/verify-procurement/` and `skills/verify-formal-approval/`) are original workshop assets included cleanly in participant/solution editions.
