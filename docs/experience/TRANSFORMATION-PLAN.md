<!-- Verbatim snapshot of the human-approved planning package (2026-11-27). Source SHA-256: b650566c4e50ac65f3204ba7bb2b2b4d3e3401fbd732d4378730281ea43bf6a9. Section 0 describes the planning session, not later slices. Later decisions live in .scratch/ux-transformation/map.md and docs/experience/EXPERIENCE-SPEC.md. -->

# Procurement Hub — Enterprise Product Experience Transformation Plan

An evidence-grounded plan to make Procurement Hub look and work like a credible financial product. It works through a Wayfinder decision map, three structurally different throwaway prototypes, a human gate on the design choice, and eight independently verifiable UX vertical slices that leave every financial, security, and workshop-packaging invariant untouched.

## 0. Status, scope and evidence legend

- **Mode:** Plan only. No application code, dependencies, skills, migrations, issues, commits or pushes were changed in this session. All commands run were read-only. The only non-read actions were in-memory contrast maths (`bun -e`) and HTTP GETs to upstream raw files and the public GitHub API.
- **Human decisions already taken (this session):**
  1. The uncommitted docs relocation is **user WIP**. Plan around it and do not touch it.
  2. The brownfield baseline is **`feat/ui-ledger-indigo` @ `b7b0343`**.
  3. Runtime baseline capture is **deferred to UX-VS-00**.
  4. **New read-only, tenant-scoped query use cases are allowed**, with security tests, no migrations and no write-path changes.
- **Evidence legend** used throughout:
  - **[V]** verified from source or command output in this session.
  - **[A]** observed in existing, *non-revision-bound* screenshots in `artifacts/ui-review/` (captured 00:54, between commits `1cc52d7` at 00:42 and `b7b0343` at 00:58).
  - **[I]** inference or assumption.
  - **[NR]** not run.
- **Runtime observations of the live app were NOT performed** (deferred by decision). The dev server responded to `GET /api/health` with `{"status":"ready"}` [V] and `/overview` returned 200 [V]. Nothing else was driven.

---

## A. Executive assessment

The engineering underneath Procurement Hub is unusually rigorous: `FOR UPDATE` locking, DB CHECK constraints, tenant-scoped idempotency, authorisation on replay, TLA+ and a revision-bound harness. The interface communicates almost none of that maturity, and in places it contradicts it. It feels generic for seven reasons:

1. **One page tries to be every product.** `src/app/page.tsx` is either the marketing landing (no session) or the entire workspace (session): KPI strip, cost-centre table, request table, decision queue, request form and identity switcher on one long scroll. Nothing is primary [V].
2. **The loudest control is a lab mechanic.** The burnt-orange "Switch identity" button is the highest-contrast element on every dashboard. It outranks "Review oldest" (`page.tsx:138-140`) [V][A].
3. **The most consequential moment is a dropdown.** Approving money is a `<select>` plus a generic "Save decision" button. There is no amount on the action, no impact confirmation, no confirmation state and no next step (`requests/[id]/decision-form.tsx`) [V].
4. **The data looks fake.** Titles such as `Warehouse gloves 5e0c2c00-9a10-…` come from E2E specs that append `crypto.randomUUID()` and run against the same dev DB used for demos (`tests/e2e/*.spec.ts`, `playwright.config.ts:9`). The review page header shows the raw UUID [V][A].
5. **It speaks in implementation vocabulary.** It uses "INV-02 holds", "atomic CREATED audit event", "USD minor units", "idempotency key", "ACID PostgreSQL budget lock" and raw enums `PENDING`/`APPROVER` in business screens [V].
6. **Decoration substitutes for hierarchy.** This includes cursor spotlight glows on every card and row, 3-D tilt, magnetic buttons (including the financial decision button), infinite `ping`/`pulse` animations, and monospace for every amount and date [V].
7. **Some integrity signals are untrue.** This is the worst problem for a product whose brand is verifiable trust (see F-01 to F-03). The dashboard can show a green "INV-02 holds" next to a red overspend banner. The decision form claims an ACID lock in the starter edition, which deliberately lacks one.

**What must fundamentally change:**
- **Separate surfaces by job.** Public `/home`, an operational workspace and a clearly labelled `/lab`.
- **Make the approval decision a first-class, impact-explicit moment** with authoritative confirmation.
- **Make every integrity statement computed per cost centre and bound to evidence**, never static.
- **Adopt a calm, institutional visual system** with editorial accents reserved for `/home`.
- **Replace test residue with realistic synthetic procurement data**, keeping PH-42 fixtures deterministic.

---

## B. Repository and capability inventory

### B.1 Git state [V]

| Item | Value |
| --- | --- |
| Branch | `feat/ui-ledger-indigo`. **Local only** (no remote branch). 5 ahead / 0 behind `main`. |
| HEAD | `b7b0343c70f59aa3cd2c7500fd24eca79b1ae2a3`: "UI: pointer effects and a more guided dashboard" (2026-11-27T00:58-03:00) |
| `main` / `origin/main` | `e1d403f` (identical). Remote `main` shows the earlier teal top-bar UI (`docs/media/procurement-hub*.webp`). |
| Local UI commits | `0c37042` Ledger Indigo + `/overview` → `0106425` Tailwind v4 + Phosphor → `459a29c` navy/light → `1cc52d7` graphite + burnt orange → `b7b0343` pointer effects (26 files, +2314/−1581, `src/app` + `package.json` + `bun.lock` + `postcss.config.json` only) |
| Uncommitted WIP (user's, untouched) | `M AGENTS.md` (Next.js agent block appended by `next dev`); `M .gitignore` (`artifacts/`); `D PRD.md`, `D SPEC.md`; untracked `doc-specs/PRD.md` and `doc-specs/SPEC.md` (**byte-identical** to HEAD root copies); 32 staged renames `doc-specs/* → doc-specs/archive/*` |
| Untracked, unexplained | `package-lock.json` (npm lockfile v3, 10:20 today; Bun is canonical); root `skills-lock.json` (skills-CLI v2 format, 11:34); `.agents/skills/prototype/`, `.agents/skills/wayfinder/` (11:34) |
| Other editions | `workshop/starter` `0e54c3b`, `workshop/guided` `0f6dd59`, `workshop/solution` `9eedcbd` (packaged 2026-11-26) |

**The WIP relocation breaks executable tooling** (documented only, by decision):
- `engineering/verify-specifications.ts:7-8,35` reads root `PRD.md`/`SPEC.md`.
- `engineering/loop-runner.ts:9` protects `PRD.md`.
- `.github/workflows/workshop-verification.yml:217` governance-guard regex flags `PRD.md`/`SPEC.md` (a deletion would trip it).
- `AGENTS.md` context routing points at root files.
- `release/GUIDED-WORKSHEET.md:24` refers to `PRD.md`.
- `doc-specs/SPEC.md` relative links (`docs/domain/...`) break from the new location.
- **No clean-SHA evidence (`worktreeDirty:false`) is possible until it is resolved.**

### B.2 Stack [V]

| Area | Version / fact |
| --- | --- |
| Next.js | `16.4.6` (App Router). **No `next.config.*` exists.** |
| React | `19.3.1` (`<ViewTransition>` built in) |
| Runtime and tooling | Bun `1.4.5` |
| Styling | Tailwind `4.3.5` (`@theme inline` tokens in `src/app/styles.css`) |
| Icons | `@phosphor-icons/react 2.1.10` (per-icon SSR imports, `_components/icons.tsx`) |
| Fonts | IBM Plex Sans/Mono via `next/font/google` (`layout.tsx`) |
| Data and validation | Zod 4.6.7, drizzle-orm 0.45.4, postgres 3.4.9 |
| Testing | Vitest 5.1.1 (node env, **no DOM/RTL**), Playwright 1.62.1, fast-check 4.11.0 |
| Motion and charts | **No motion, chart or UI-kit libraries.** |

Fonts confirmed available in the local `next/font` catalogue: Geist, Geist Mono, Inter, Inter Tight, Instrument Serif, Newsreader, Fraunces, Source Serif 4, IBM Plex Serif, Hanken Grotesk, Public Sans, Schibsted Grotesk, Literata, Spectral, Libre Caslon Display.

### B.3 Frontend inventory (responsibilities → limitations) [V]

| File | Responsibility | Key limitations |
| --- | --- | --- |
| `src/app/layout.tsx` | Root layout, Plex fonts, skip link, **global `<PointerEffects/>`** | Pointer listener on every route; dual `color-scheme` |
| `src/app/page.tsx` (433 lines) | `/` = landing when anonymous, full dashboard when signed in (`force-dynamic`) | Dual purpose; aggregate KPIs; identity switcher in header; `.session-state` used by E2E |
| `src/app/overview/page.tsx` | `/overview` = landing for any session | Never shipped on `main`; "Overview" nav item opens marketing |
| `_components/app-shell.tsx` | Dark sidebar (Dashboard, Overview), "Check lab readiness" → raw `/api/health` JSON | Two nav items; JSON dead end; infinite `animate-ping` |
| `_components/landing.tsx` + `landing-content.ts` + `parallax-stage.tsx` | Hero with identity form, ledger composition, roles, trust pyramid, invariants | Static invariant claims; workshop-date kicker; identity select as hero CTA |
| `_components/dashboard-panels.tsx` | `DecisionQueue`, `LedgerReconciliation`, `NextStep` | Reconciliation shows success while overspent (F-02); "Review" wording |
| `_components/dashboard-metrics.ts` | Pure aggregates in integer minor units | `availableMinor` summed across centres (F-01) |
| `_components/budget-bar.tsx` | Bullet bar: committed, hatched pending, 80 % marker | Warning/success fills < 3:1 non-text contrast (F-13) |
| `_components/pointer-effects.tsx` | Delegated spotlight/tilt/magnetic | `querySelectorAll` every frame; magnetic on financial actions |
| `_components/role-gateway.tsx`, `lab-identity-form.tsx`, `use-lab-identity-switch.ts` | Synthetic identity switch → `window.location.replace("/")` | Presented as primary product entry |
| `_components/ui.ts`, `status-badge.tsx`, `icons.tsx`, `initials.ts` | Class tokens, badges, icons | Uppercase micro-labels; enum labels; pulsing PENDING |
| `src/app/purchase-request-form.tsx` | Requester form, client idempotency key, budget preview | **Amount in cents**; generic errors; right rail below the fold |
| `src/app/requests/[id]/page.tsx` | Detail: header with UUID chip, 3-step progress, ledger, commitment, audit, decision | UUID exposure; rotated "Committed" stamp; decision buried in aside |
| `src/app/requests/[id]/decision-form.tsx` | Select + Save, key per payload in `useRef`, error-code map | No impact confirm; jargon; no reconcile on network failure; key lost on reload |
| `src/app/format-purchase.ts` | `formatUsd` (BigInt-safe), UTC dates, utilisation % | Good. Keep. |

### B.4 Server and domain contracts the UI depends on [V]

| Contract | Detail |
| --- | --- |
| Session | `readLabSession()` (`src/server/auth/lab-session.ts`) derives tenant, user, role and limit from `lab_sessions` + `memberships`. 8 h HttpOnly SameSite=Strict cookie. |
| Services | `requests` = `purchaseRequestService(postgresRequests)`: `listCostCenters`, `create`, `list` (REQUESTER scoped to own), `find`, `detail` (`canDecide`, `canApprove` from domain), `decide`, `audit` (APPROVER/AUDITOR only) |
| Decision API | `POST /api/purchase-requests/:id/decision` returns `{...request, costCenter, commitment, replayed}`. Error codes: `INVALID_INPUT 400`, `UNAUTHENTICATED 401`, `FORBIDDEN 403`, `APPROVAL_LIMIT_EXCEEDED 403`, `NOT_FOUND 404`, `IDEMPOTENCY_CONFLICT 409`, `INVALID_TRANSITION 409`, `INSUFFICIENT_BUDGET 409`, `INTERNAL_ERROR 500`. **The response shape is identical in the starter baseline route** (`5377971`). |
| Input limits | title ≤ 120; justification and reason ≤ 2 000; trimmed, well-formed; `amountMinor` positive int; REJECT requires reason |
| Data the UI lacks today | No tenant-wide audit feed. No commitments list. No requester display name on `PurchaseRequest` (available via the `CREATED` audit event for APPROVER/AUDITOR). |

### B.5 Workshop packaging constraints (critical for UX work) [V]

`engineering/package-workshop.ts` builds starter and guided by taking current `src/app` and **overlaying from `5377971`**:
- `postgres-requests.ts`
- `schema.ts`
- the decision `route.ts`
- `drizzle/meta/_journal.json`
- `tests/integration/procurement.test.ts`

Consequences:

1. **All UI changes ship to all three editions.** The UI must render the starter's overspent state (`-$4,000.00`) truthfully and must not claim locking or idempotency protections there.
2. **Any new read model must live in new files** and use only baseline tables. Baseline `schema.ts` exports `costCenters`, `purchaseRequests`, `financialCommitments`, `auditEvents`. It must not extend `PurchaseRequestRepository`, or starter compilation breaks.
3. **Solution DB CHECK makes overspend unreachable on solution.** Overspent rendering can only be verified by pure view-model tests and by a starter-edition rehearsal.
4. `.agents/` is already excluded from participant editions. **`.scratch/` is not ignored and would be packaged** [V: `git check-ignore` exit 1].

### B.6 Verification inventory [V]

| Kind | Detail |
| --- | --- |
| Scripts (exist) | `check:static`, `verify:architecture`, `test:unit`, `test:integration`, `test:concurrency`, `test:security`, `test:properties`, `test:harness`, `test:migration`, `test:e2e`, `verify:concurrency`, `verify:formal`, `verify:all`, `ph42:reproduce`, `lab:*`, `loop:run`, `loop:status`, `slides:*` |
| E2E specs (4) | `scaffold.spec.ts`, `procurement.spec.ts`, `decision.spec.ts`, `procurement-budget.spec.ts` |
| UI contracts the E2E specs rely on | `goto("/")`; label `Lab identity` + button `Switch identity`; `.session-state` text `"Northstar Industries · <Name> · <ROLE>"`; headings `My requests` / `Tenant requests`; labels `Title`, `Justification`, `Amount (USD cents)`, exact `Cost center`; button `Submit request`; link `Back to purchase requests`; region `Record decision` with `getByLabel("Decision").selectOption` + button `Save decision` + label `Rejection reason`; `getByRole("article").getByRole("status")`; region `Audit trail` list items; heading `Financial commitment`; `tr[data-cost-center-code]`; nav `Filter requests by status` + `?status=APPROVED`; text `exceeds your approval limit` / `exceeds your organizational approval limit`; 390 px overflow ≤ 1 px; foreign detail → 404 |
| Feature maps citing those labels | `skills/verify-procurement/features/{purchase-request-approval,purchase-request-creation,idempotent-retries,audit-trail,authorization}.md` and `SKILL.md:86` |
| Protected paths (`loop-runner` + CI governance) | `eslint.config.ts`, `.github/workflows/`, `PRD.md`, `SPEC.md` (CI), `engineering/slice-checks.json`, `tests/concurrency/`, `tests/security/`, `formal/` (CI) |
| ESLint UI boundary gap | Only `src/app/**/*.tsx` is restricted. `.ts` files in `src/app` (`dashboard-metrics.ts`, `ui.ts`, `format-purchase.ts`) are unguarded. |
| Docs drift | `docs/architecture/REQUIREMENTS-TRACEABILITY.md` cites the non-existent `tests/e2e/procurement-approval.spec.ts` and `tests/properties/procurement.properties.test.ts` (actual: `decision.spec.ts`, `procurement-budget.spec.ts`, `contract.test.ts`) |

### B.7 Skill installation and discovery [V]

**`bun engineering/bootstrap-skills.ts --verify` → exit 1:**
- 23/24 pass.
- **`ui-ux-pro-max` FAIL**: 3 extra `scripts/__pycache__/*.pyc` files. Its Python helpers were executed at some point, contradicting `SKILL-INVENTORY.md`'s "scripts not executed". This also fails the PREP `skills-integrity` slice check.

**Wayfinder and Prototype:**
- Installed by the skills CLI (root `skills-lock.json` v2) with **CRLF line endings**.
- After CR removal, content is **byte-identical to upstream `mattpocock/skills@6f7f783`**:
  - wayfinder `SKILL.md` `0c9fa967…`
  - prototype `SKILL.md` `714de632…`, `UI.md` `723211e8…`, `LOGIC.md` `f61c7d24…`
- **Not in `engineering/skills-lock.json`. Not gitignored** in `.agents/skills/.gitignore`.
- As-is bytes would fail the lock's raw SHA-256 verification.

**Upstream dependencies:**
- Wayfinder calls the `grilling`, `research` and `domain-modeling` skills and a tracker doc from `setup-matt-pocock-skills`.
- `grilling` (`skills/productivity/grilling`) and `research` (`skills/engineering/research`) are **not installed**.
- Wayfinder is `disable-model-invocation: true` / `allow_implicit_invocation: false`, so it is user-invoked only.
- Its research step says "push the branch", which is **not allowed here**.

**Devin discovery (observed in this session's skill registry):**
- `.agents/skills/*` packages **are** discovered (e.g. `prototype` is listed). Wayfinder is hidden because of its no-implicit-invocation flag.
- Repo-local `skills/verify-*` are **not** discovered.
- **The global `~/.agents/skills/to-prd` (sha `a28b9ac…`) shadows the pinned repo `to-prd` (`db7e718…`).**
- Portable rule: always read skills by explicit path and record their digest in the handoff.

### B.8 Seed data [V]

| Seed | Detail |
| --- | --- |
| `scripts/seed-lab.sql` | 2 tenants; 9 memberships; `CC-ENG-01` $10,000, `CC-OPS-01` $25,000, `CC-MER-01` $10,000. **No purchase requests.** |
| `scripts/seed-ph42.ts` | Resets `CC-ENG-01` and inserts "Cloud Security Audit Tooling" and "CI Runner Capacity Expansion" at $7,000 each (ids `4000…0001`/`…0002`) |
| Other | `lab:reset` clears all rows; `lab:doctor` expects exactly 3 cost centres |

---

## C. UI/UX audit (prioritised findings)

Severity scale: **Critical** (false financial or security signal), **High** (blocks or misleads a core job), **Medium** (friction or inconsistency), **Low** (polish).

| ID | Sev | Evidence | Screen / persona | Impact | Direction | Code | Verify by |
| --- | --- | --- | --- | --- | --- | --- | --- |
| F-01 | **Critical** | [V] KPI "INV-02 holds" uses tenant aggregate `allocated − committed`. In PH-42 starter state (ENG 14,000/10,000; OPS 0/25,000) aggregate = +$21,000 → **green "INV-02 holds"** beside the red violation banner. | Dashboard / all roles, instructor | False integrity claim during the live demo | Compute invariant status **per cost centre**. Never show "holds" badges; show violations prominently, otherwise neutral facts. | `page.tsx:111,184-195`; `dashboard-metrics.ts:22-24` | Red→green Vitest on view-model with overspent fixture; starter rehearsal screenshot |
| F-02 | **Critical** | [V] Auditor NextStep "Ledger balanced (INV-01)" + reconciliation success when Σcommitted = Σapproved, even if committed > allocated | Dashboard / Auditor | Auditor told the ledger is fine while overspent | Two explicit per-centre clauses: *within allocation* and *reconciles to approved requests* | `dashboard-panels.tsx:105-151,182-197` | Vitest view-model; E2E auditor |
| F-03 | High | [V] Static or untrue claims. "Protected by an automatic idempotency key and ACID PostgreSQL budget lock" ships in starter, which has no lock. Hero chips "INV-01 holds" and "200 / 409" are static. "Ten invariants… model-checked in TLA+" overclaims: RTM says INV-04 is out of TLA+ scope and INV-05/06 are not modelled. "Real-time PostgreSQL ledger balances" is a per-request render. | Landing, review, dashboard / all | Credibility; spoiler-adjacent in starter | Claims only when computed or evidence-linked. Label illustrations "Illustrative scenario". Move mechanics to the lab. | `decision-form.tsx:109-112`; `landing.tsx:72-103,243`; `page.tsx:208` | Copy-claims checklist in review; grep-based check in UX-VS-07 |
| F-04 | High | [V][A] UUID-suffixed titles from E2E runs against the dev DB; full UUID chip on the review header; full commitment UUID | Lists, queue, review / all | Product looks unfinished; IDs dominate titles | Presentation-only short reference plus title untouched; demo seed; E2E isolation policy (§14) | `tests/e2e/*.spec.ts`; `playwright.config.ts:9`; `requests/[id]/page.tsx:103,281` | Screenshot review; E2E asserts the ref is present and the full ID is reachable |
| F-05 | High | [V] Amount entered in **cents** ("Amount (USD cents)", placeholder `700000`) | Create / Requester | 100× entry errors; cognitive load | Dollar input parsed exactly from a string to integer minor units (no float), live `$` preview, server unchanged | `purchase-request-form.tsx:112-138` | fast-check property tests on the parser; E2E |
| F-06 | High | [V] Decision is a select plus "Save decision". No amount on the action, no impact confirmation, no success state, no next request. Network error copy is jargon. No status reconciliation on unknown outcome. Key lost on reload. | Review / Approver | Error-prone, low-trust decision moment | Decision panel with "Approve $X" / "Reject request", confirm dialog, authoritative result, reconcile-then-retry, next-request CTA (§13) | `decision-form.tsx` | E2E incl. route-interception lost-response test |
| F-07 | High | [V] Over-limit approver sees a warning, but Approve remains selectable; the refusal arrives only after Save. No guidance on who can approve. | Review / Limited approver | Wasted action; unclear escalation | Show the limit comparison before acting; Approve unavailable with reason (HD-11); Reject available; escalation hint | `requests/[id]/page.tsx:308-316` | E2E + existing security INV-06 tests |
| F-08 | Med-High | [V][A] Identity switcher (primary orange button) in the dashboard header; hero CTA is the identity select | Dashboard, landing / all | Simulation dominates the product; not production-like | Lab bar (thin, labelled "Synthetic lab identity") + `/lab`; business primary actions get the accent | `page.tsx:138-140`; `landing.tsx:188-197` | Screenshot review; E2E entry flow |
| F-09 | Medium | [V][A] IA: `/` dual-purpose; sidebar "Overview" opens marketing; "Check lab readiness" opens raw JSON; one long page; requester submit button below the fold at 1440×900 | Global / all | Disorientation; dead ends | Route map (§F); `/lab` renders readiness | `app-shell.tsx`; `page.tsx` | E2E navigation contract; fold checks |
| F-10 | Medium | [V] Glossary drift: "Available headroom" (glossary: Available Budget, *avoid "headroom"*); breadcrumb "Workspace" (glossary avoids it for Tenant); "Review" (glossary avoids it for Approval Decision); raw enums shown | Global | Inconsistent ubiquitous language | UX-writing table aligned to `docs/domain/GLOSSARY.md` (HD-22) | `page.tsx:119,185`; `landing.tsx:58` | Copy review; domain-modeling skill |
| F-11 | Medium | [V] Monospace for all money, dates and chips; uppercase micro-labels; rotated "Committed" stamp; status pills uppercase | Global | Terminal look; weak hierarchy | Sans with `tabular-nums` for figures; mono only for IDs, keys and commands; sentence-case labels | `ui.ts`, multiple | Visual review |
| F-12 | Medium | [V] Global pointer listener runs `querySelectorAll('[data-magnetic]')` per frame; magnetic translate on "Save decision"/"Submit request"; spotlight on all cards and rows; tilt; infinite ping/pulse | Global | Perf on presenter laptops; moving targets on consequential actions; WCAG 2.2.2 risk | Remove from the workspace; constrain motion to `/home` stage and functional transitions (§J.6) | `pointer-effects.tsx:71`; `status-badge.tsx:11`; `app-shell.tsx:47` | Reduced-motion E2E; trace/INP |
| F-13 | Medium | [V] Non-text contrast: `--warning-solid #eaaa08` on white **2.05:1**, `--success-solid #17b26a` **2.76:1** (< 3:1, WCAG 1.4.11). Text tokens pass (accent 5.18, ink-3 5.27, warning text 4.77). | Budget bars, dots | Low-vision users miss state | Token pairs ≥ 3:1 for graphics, ≥ 4.5:1 for text | `styles.css:34-37,29-32` | Vitest token-contrast test |
| F-14 | Medium | [V] Focusable `div tabIndex=0` with `aria-label` and no role (budget tooltip); 3 KPI links to the same `#budgets` anchor; hover-only tooltip detail | Dashboard | SR/keyboard ambiguity | Data in visible text or `<details>`; no focusable non-controls | `page.tsx:249-275` | Keyboard E2E; manual SR spot check |
| F-15 | Low-Med | [V] Dark-mode tokens via `prefers-color-scheme` while shell and hero are always dark | Global | Double maintenance; projector variance | Decide light-only v1 (HD-09) | `styles.css:61-104` | Screenshot matrix |
| F-16 | Low | [V] Empty and error copy references lab internals ("Run lab initialization", "Switch to a Requester identity", "submission key is in use") | Empty states | Confusing for business users | Business copy plus lab hint only in the lab bar | `page.tsx:216,349`; form errors | Copy review |
| F-17 | Medium | [V] Queue is oldest-first only. It does not flag "may exceed available budget" (pending amount > centre available) or group over-limit items. | Dashboard / Approver | Approver discovers conflicts late | Prioritised groups from existing data, labelled *preliminary* | `dashboard-metrics.ts:26-30` | Vitest prioritiser; E2E |
| F-18 | Medium | [V] Auditor has no tenant-wide audit or commitments view; must open each request | Auditor | Traceability work is N clicks | `/audit` via new read-only use cases (approved) | n/a | Security + E2E |

**Persona summary:**
- **Requester:** form below fold; cents; no "what happens next".
- **Approver:** queue in the right rail; dropdown decision; no next request.
- **Limited approver:** late refusal; no escalation path.
- **Auditor:** potentially false "balanced" signal (F-02); no audit index.
- **Workshop participant/instructor:** PH-42 overspend is visible via banner and red row (good), but F-01/F-03 contradict it; readiness opens JSON.

---

## D. Creative direction — "Enterprise Financial Intelligence"

**Positioning line:** *Every financial decision, backed by evidence.*

**Principles:**
- Calm surfaces.
- One accent with a job.
- Numbers as the hero.
- Evidence over badges.
- Progressive disclosure from business to engineering.

### D.1 Benchmark research (text-only fetch; no rendering, motion or interaction was observed) [V]

| Product | Structural observations from fetched markup and copy | Principle to adopt (not copy) |
| --- | --- | --- |
| Decade | Digit-strip markup (`0123456789` per digit) implying odometer numerals; numbered 01–06 narrative blocks rendered twice (suggests separate desktop/mobile or sticky story; **unverified**); triad "Human / Patrimonial / AI"; three-layer philosophy "Protege / Prepara / Prospera" | Layered narrative of *protect → decide → record*; numerals as visual material; numbered chapters |
| Ramp | Live counter of payments processed; "Procure to pay without chasing approvals"; approvals framed as workflow | Approval as flow, not form; quantified value statements |
| Stripe | "Global GDP running on Stripe" counter; stats band; story blocks with quantified outcomes | Quantified, **sourced** claims |
| Mercury | Explicit **"Launch demo"** CTA; illustrations with descriptive alt text; "Total visibility" money in/out | Demo mode is labelled as demo → our synthetic lab entry |
| Brex | "Control spend before it happens"; metrics with **disclaimer "based on internal metrics from March 2025"** | Illustrative metrics carry provenance labels |
| Linear | Real product UI as hero (an issue view with activity); "Fig 0.1/0.2/0.3" figure captions; dated changelog | Product UI as hero; editorial figure captions |

The UX-VS-00 research ticket (W-03) will inspect the rendered sites with Playwright (read-only browsing) before any motion claims are made.

### D.2 Three directions

Palettes are exploration seeds. Contrast is computed in this session with WCAG 2.x relative luminance.

**Direction A — Institutional Intelligence** (navy, petroleum, teal)
- **Rationale:** treasury or central-bank composure. Blue is trust without generic SaaS cobalt. Teal is reserved for *verified evidence*, never for brand chrome.
- **Ink and surfaces:** navy `#0B1628` on canvas `#F8FAFC` **17.31:1**; slate-navy `#172D46` 13.38; secondary text slate-600 `#475569` on white 7.58; slate-500 `#64748B` 4.55 on canvas (≥ 14 px only).
- **Primary action:** petroleum `#176B87`, white-on **6.02:1**.
- **Teal:** `#0D9488` is **3.74:1 on white → graphics and large text only**. Teal-700 `#0F766E` 5.47 for teal text.
- **Dark sections:** cool neutral `#E7EDF4` on navy 15.37; teal-300 `#5EEAD4` on navy 12.24.
- **Semantic** (kept distinct from brand): approved green-700 `#15803D` 5.02; pending amber-700 `#B45309` 5.02 (graphic amber-600 `#D97706` 3.19); violation red-700 `#B91C1C` 6.47.
- **Data viz:** committed = navy solid (15.37 on track `#E7EDF4`); pending exposure = hatched petroleum (5.11 on track); available = track; over-allocation = red hatch beyond 100 % with marker; 80 % review tick.
- **Typography:** UI IBM Plex Sans (retain) with `tabular-nums`; display serif **Source Serif 4** or **IBM Plex Serif** (superfamily coherence) for `/home` and large statements; Plex Mono for IDs, keys and commands only.
- **Iconography:** Phosphor regular, 16/20 px, semantic only.
- **Density:** comfortable (rows 44 px).
- **Elevation:** borders first; 2 shadows (popover, dialog).
- **Risk:** can feel conservative. Mitigated by editorial `/home`.

**Direction B — Modern Fintech** (graphite, cobalt, indigo)
- **Rationale:** crisp product-led software feel.
- **Colour:** graphite `#101828` on `#F9FAFB` 16.98; slate `#344054` 10.01; cobalt `#375DFB` white-on **5.10**; cobalt-700 `#2F4FD8` 6.50 (5.81 on tint `#EEF2FF`).
- **Indigo-400 `#818CF8` fails on white (2.98)** → dark surfaces only (5.95 on graphite).
- **Typography:** Geist + Geist Mono, tight display.
- **Density:** compact (rows 40 px).
- **Risks:** closest to the "generic AI/SaaS blue-purple" look the brief prohibits; Geist is strongly associated with Vercel; least differentiated.

**Direction C — Editorial Finance** (forest, gold, warm neutral)
- **Rationale:** private-bank or annual-report gravitas; memorable on stage.
- **Colour:** forest `#13251F` on `#FAF9F6` 15.20; forest-slate `#27483C` 9.60; green `#34785C` white-on 5.27.
- **Gold `#C5A76C` fails on white (2.30)** → on forest only (6.95). Gold-700 `#8A6D32` 4.62 for text.
- **Typography:** display **Fraunces** or **Instrument Serif**; UI **Public Sans** or **Hanken Grotesk**; Plex Mono for technical tokens.
- **Risks:**
  - Green brand collides with the "approved" semantic, so approval would need a non-green cue (ink + check + label).
  - Gold collides with pending/warning amber.
  - Warm palettes reduce projector contrast perception.

### D.3 Current palette note

The current graphite + burnt orange (`#c2410c`, 5.18:1) is defensible for text. However, the **orange brand sits next to amber "pending" semantics**, and `--warning-solid` fails 3:1 as a graphic. This is a structural reason to move off orange regardless of taste.

---

## E. Recommended product experience

**Recommendation (human decides, HD-07/HD-08):**
- **Direction A for the operational workspace.**
- **Borrow C's editorial typography** (serif display, figure captions, chaptered narrative) **for `/home` only.**
- **Interaction model: Variant B's approval-first master-detail for approvers**, inside A's shell.

**Why this combination:**
1. Highest contrast headroom for projector and mobile.
2. Brand colour is separable from all three status semantics.
3. Keeps IBM Plex Sans (no font churn for workshop screenshots or slides; Plex's tabular figures are excellent).
4. Approval-first is the product's core job and the PH-42 demo path.

**Alternatives and trade-offs:**
- **Pure B:** fastest to build, least distinctive.
- **Pure C:** most memorable, but highest semantic-colour risk and the most custom typography and performance cost.
- **Keep the current orange:** least work, but fails F-13 and keeps the amber collision.

**Self-critique:**
- A risks "bank-blue sameness". The safeguards are disciplined composition, real numbers as hero, no card grids, and editorial captions.
- The plan deliberately prototypes all three structurally before committing.

---

## F. Information architecture

### F.1 Sitemap and route contract (proposal; HD-10)

| Route | Audience | Data (existing / new read model) | Notes |
| --- | --- | --- | --- |
| `/home` | Public (works with or without a session) | none (illustrative content, labelled) | Canonical landing. With a session: "Open dashboard". |
| `/` | — | session check | Server `redirect()` (307): session → `/dashboard`, else → `/home`. Legacy `/?status=X` → `/requests?status=X`. Not permanent, because the target depends on the session. No `next.config` needed. |
| `/overview` | — | — | Local-branch-only route never released on `main`. Redirect to `/home` for one release, then delete (HD-10). |
| `/procurement-hub` | — | — | **Recommend not creating it** (no inbound links exist; adds surface). Optional redirect page if the human wants it. |
| `/lab` | Public (lab mode) | `listLabIdentities` | Synthetic identity selection, rendered readiness (not raw JSON), PH-42 scenario brief (spoiler-free), verification commands. Banner: "Simulation — not production sign-in". |
| `/dashboard` | All roles | `list`, `listCostCenters` (+ `listAuditEvents` for Auditor) | Role-aware composition (§12) |
| `/approvals` | APPROVER | `list(PENDING)`, `listCostCenters` | Inbox master-detail. Other roles: nav hidden; direct visit → role-restricted state with no data fetched. |
| `/requests` | All | `list` (REQUESTER = own) | Filters `?status=` (keeps `Filter requests by status` nav) |
| `/requests/new` | REQUESTER | `listCostCenters` | Full-page form |
| `/requests/[id]` | All (service-scoped) | `detail`, `audit` | **Existing deep link preserved.** Review workspace for APPROVER. |
| `/budgets` | All | `listCostCenters` + pending by centre | Per-centre ledger and bullet charts |
| `/audit` | APPROVER, AUDITOR (FR-08) | **new** `listAuditEvents`, `listCommitments` | Tenant-wide feed, filters, links to trails |

### F.2 Structure

- **Route groups** under one root layout (avoids full-page reloads between groups):
  - `src/app/(public)/home`
  - `src/app/(public)/lab`
  - `src/app/(workspace)/{dashboard,approvals,requests,budgets,audit}`
  - `src/app/requests/[id]` moves into `(workspace)` with an identical URL.
- **`(workspace)/layout.tsx`** renders the shell and a session-presence redirect to `/lab` for UX. **Authorisation stays in services and pages** (Next docs: do not rely on layout checks alone).
- **Navigation shows only real capabilities, by role:**
  - Requester: Dashboard · Requests · Budgets
  - Approver: Dashboard · Approvals (count) · Requests · Budgets · Audit
  - Auditor: Dashboard · Requests · Budgets · Audit
  - Lab link in the lab bar for everyone.
- **Back navigation:** real links (no `router.replace` for primary navigation). The review page's "Back to purchase requests" returns to the originating list via a `from=` query param validated against an allowlist.
- **Identity switch:** after switching, go to `/dashboard` (today it uses `window.location.replace("/")`, which still works through the redirect).

---

## G. Journey maps (current [V from code] → proposed)

| Persona | Current state | Proposed state |
| --- | --- | --- |
| **Approver** | `/` landing → pick identity in a select → Switch (2) → long dashboard; queue in the right rail → Review (3) → detail → open Decision select (4) → choose Approve (5) → Save (6) → badge changes; no confirmation or next step → Back (7) → find the next one. | `/home` → "Enter the lab workspace" → `/lab` persona row (1) → `/dashboard` attention bar "4 requests need your decision · $21,400 in your authority" → **Review next request** (2) → review workspace shows impact → **Approve $7,000.00** (3) → confirm dialog (4) → authoritative confirmation with commitment → **Review next request** (5). |
| **Limited approver** ($5,000) | Opens a $6,000 request → amber warning → can still choose Approve → Save → red "exceeds your organizational approval limit". | Queue shows a "Needs higher authority" group. Review shows "Your approval limit $5,000.00 · This request $6,000.00". Approve is unavailable with that explanation (HD-11); **Reject request** remains; escalation hint "An approver with a higher limit must approve this request". Server 403 remains authoritative. |
| **Requester** | Dashboard right-rail form (submit below fold at 1440×900 [A]) → cents entry → detail. | Dashboard "New purchase request" → `/requests/new` (dollars, cost-centre context with available budget and a "preliminary, not a guarantee" note) → submit → detail with "What happens next" (Pending decision → decided) → `/requests` tracking with plain-language status. |
| **Auditor** | Dashboard ("Ledger balanced" possibly false) → open each request to see its trail. | Dashboard integrity statement per cost centre (two clauses) → `/audit` feed (type, cost centre, actor, time) → request trail → commitments ledger. |
| **Workshop participant / instructor** | Landing identity select; overspend visible via banner and red row; readiness opens JSON; claims contradict PH-42. | `/lab` hub (synthetic personas grouped by tenant and role, readiness status, PH-42 brief + commands) → `/dashboard` overspend banner in business language with a technical disclosure (INV-01/02) → `/requests/[id]` technical details panel (IDs, idempotency semantics), all spoiler-free in starter. |

---

## H. Skill integration plan (Wayfinder, Prototype and dependencies)

1. **Replace the CLI install with the audited mechanism** (needs approval, HD-03):
   - Delete `.agents/skills/{wayfinder,prototype}` and root `skills-lock.json`. These are destructive operations on files not created by the agent, so they need explicit confirmation.
   - Add lock entries to `engineering/skills-lock.json` (`schemaVersion 1`, source `https://github.com/mattpocock/skills`, MIT, `audit: source-and-static-review`, `executable: false`):

     | Skill | Files and SHA-256 (LF upstream bytes) |
     | --- | --- |
     | `wayfinder` | `LICENSE` `0e7ac423…dbb5`; `SKILL.md` `0c9fa967…6561f`; `agents/openai.yaml` `88bc81a1…ad073` |
     | `prototype` | `LICENSE`; `SKILL.md` `714de632…bfbe3`; `UI.md` `723211e8…d45ad3`; `LOGIC.md` `f61c7d24…4a01ab9`; `agents/openai.yaml` `5af65e43…cc55dc` |
     | `grilling` | `LICENSE`; `SKILL.md` (`skills/productivity/grilling`) `a146842e…d4e2`; `agents/openai.yaml` `1411d7df…ee9b` |
     | `research` | `LICENSE`; `SKILL.md` (`skills/engineering/research`) `1f629e18…1d33`; `agents/openai.yaml` `9b4c470d…474d0d` |

   - Install with `bun engineering/bootstrap-skills.ts`, then `--verify`.
   - Add `/wayfinder/ /prototype/ /grilling/ /research/` to `.agents/skills/.gitignore`.
2. **Revision and age policy:**
   - `6f7f783` is dated 2026-11-25, which is under the 7-day preference. It is already the pin for 6 existing skills.
   - Option (recommended): pin each new skill to the **last commit that modified it and is ≥ 7 days old**, provided its digests equal those above. Otherwise keep `6f7f783` with explicit human sign-off.
   - These are prose-only packages with no executables.
3. **Tracker adaptation:**
   - Author `docs/workflows/WAYFINDER-LOCAL-TRACKER.md`, adapted with attribution from `setup-matt-pocock-skills/issue-tracker-local.md` (`7dcda20a…`): map at `.scratch/<effort>/map.md`; tickets at `.scratch/<effort>/issues/NN-slug.md` with `Type:`, `Status:` and `Blocked by:` lines.
   - **No GitHub issues. No pushes.** Research outputs go to `.scratch/<effort>/research/*.md`, not pushed branches.
   - `.scratch/` must be either gitignored or excluded in `package-workshop.ts` (HD-06).
4. **Discovery fallback:**
   - Every slice handoff lists the explicit paths it read (`.agents/skills/<name>/SKILL.md` plus sub-files) and their digests.
   - Never rely on name resolution, because of the global `to-prd` shadowing (HD-05).
   - Wayfinder is invoked explicitly by the human ("work through the map") or by explicitly reading its file.
5. **Fix integrity:**
   - Remove `ui-ux-pro-max/scripts/__pycache__` (HD-04).
   - Policy: read its CSV/markdown data directly; run helper scripts only with approval and `PYTHONDONTWRITEBYTECODE=1`.
6. **Quality gates, not decoration:**
   - `ui-taste` (`reference/operate.md`, `new-work.md`, `anti-slop-craft.md`) at prototype and slice review.
   - `web-design-guidelines` (`references/command.md`, `file:line` findings) per slice.
   - `ui-ux-pro-max` `references/quick-reference.md` for the accessibility checklist.
   - `vercel-react-best-practices` for server/client split and bundles.
   - `clean-code` + `code-review-and-quality` before every handoff.
   - `verify-procurement` for runtime proof.
   - `verify-formal-approval` regression at UX-VS-07.
   - `domain-modeling` for glossary decisions.
   - `tdd` for view-models and parsers.
   - Image-first in `ui-taste`: no authorised image generator is assumed, so state the limitation and use prototype renders as targets.
7. Update `docs/architecture/SKILL-INVENTORY.md` (24 → 28 skills, provenance, audit notes, execution truth for `ui-ux-pro-max`).

---

## I. Prototype plan (post-approval, throwaway)

**Question:** "What should the workspace, inbox, review and home look like?" This uses the Prototype **UI branch**, plus the **LOGIC branch** for the decision state machine (W-12).

**Placement:**
- **Sub-shape A (preferred).** Mount variants on existing routes of baseline `b7b0343`:
  - `/` (signed-in dashboard; inbox variants live here)
  - `/requests/[id]` (review)
  - `/overview` (home)
- Switched by `?variant=A|B|C`.
- Files live in `src/app/_prototype/` (underscore folders are non-routable). Names `variant-a.prototype.tsx` and so on.
- Floating `prototype-switcher.tsx`:
  - Uses ← and → keys, ignored while an input is focused. Inbox variants therefore use ↑↓/j/k.
  - Gated by `process.env.NODE_ENV !== "production" && isLabEnabled()`.
- Branch `prototype/ux-variants`, local only, never merged.

**Safety:**
- Variants use existing server data fetching (real, authorised, tenant-scoped) and are read-only.
- Approve and Reject open a stub panel ("PROTOTYPE — no decision will be recorded") and **never call the decision API**.
- `/audit` regions use labelled stub rows until the read models exist.
- No auth changes.

**Variants (structurally different):**

| | A — Institutional Command Center | B — Approval-First Workspace | C — Editorial Financial Intelligence |
| --- | --- | --- | --- |
| Nav | Persistent left rail | Slim rail + inbox as the home for approvers | No sidebar; masthead with section tabs |
| Dashboard | Full-width **cost-centre ledger band** (bullet charts) as the primary object; decision queue table + exposure column below | **Master-detail**: prioritised queue (≈ 380 px) on the left, live review pane on the right; requester and auditor get list-first equivalents | **Daily brief**: one serif sentence summarising the state with inline figures, then editorial sections "Needs your decision / Where the money is / What changed" |
| Review | Three-column statement: request · ledger impact · authority + actions | Review pane with **sticky action footer** "Approve $X / Reject request" and keyboard flow | **Memo** document: title, justification as prose, margin notes for ledger impact, decision as a signature block |
| Home | Data-first hero: a real-looking ledger statement (labelled illustrative) | Product-tour hero of an inbox moving from pending to approved | Scroll-driven chaptered story (01–05) with sticky figure |

**Comparison protocol (human gate):**
- **Tasks** (timed, click-counted, per variant):
  - T1 find pending count
  - T2 open the next actionable request
  - T3 state the projected available budget
  - T4 identify over-limit items
  - T5 requester finds request status
  - T6 auditor finds terminal outcomes
- **Viewports:** 1920×1080, 1440×900, 1280×720 (projector), 768×1024, 390×844.
- **Checks:** anti-slop checklist and copy-truthfulness check.
- **Captures:** `artifacts/ui-review/prototype-<sha>/<variant>-<surface>-<viewport>.png` (gitignored).
- **Verdict:** recorded in `.scratch/ux-transformation/issues/08-workspace-variants.md` under `## Answer`, per surface, with a "steal list" (e.g. "B's inbox + A's ledger band + C's home").
- **Capture and cleanup:** commit the variants to `prototype/ux-variants` (local) and leave a pointer in the ticket. Production slices **rewrite** the winner properly; no prototype code is promoted.

---

## J. Design system proposal (direction-agnostic structure; values per HD-07)

### J.1 Tokens (CSS custom properties in `src/app/styles.css` via `@theme inline`, the existing pattern)

| Group | Tokens |
| --- | --- |
| Colour roles | `canvas`, `surface`, `surface-sunken`, `line`, `line-strong`, `ink`, `ink-2`, `ink-3`, `brand`, `action`, `action-hover`, `focus`, `approved`, `pending`, `violation`, `evidence` (teal in A), `viz-committed`, `viz-pending`, `viz-track`, `viz-over` |
| Contrast rule | Each role pair is tested: text ≥ 4.5:1, large text/graphics ≥ 3:1, focus ring ≥ 3:1 against adjacent colours |
| Typography | `--font-ui`, `--font-display` (home only, loaded in `(public)/layout.tsx` to keep it off workspace bundles), `--font-mono` |
| Type scale | 12/13/14/16/18/20/24/32/40/56/72; line-height 1.45 body, 1.15 display |
| Figures | Global `font-variant-numeric: tabular-nums` on money and KPI elements |
| Spacing | 4-px base: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 96 |
| Radius | 4 (chips), 6 (controls), 8 (panels), 0 (tables); pills only for status labels |
| Elevation | Borders first; `shadow-popover` and `shadow-dialog` only |
| Motion | See J.6 |

### J.2 Component inventory (new `src/app/_ui/`)

- Shell: `AppShell` (role-aware nav, lab bar), `PageHeader`, `AttentionBar`
- Money and budget: `MoneyValue` (sign, tabular, `aria-label` with full words), `BudgetBullet` (committed / pending hatched / available / over-allocation hatch, text equivalents)
- Status and references: `StatusLabel` (icon + text + colour; human labels "Pending decision", "Approved", "Rejected"), `RequestReference` (short ref + copy full ID)
- Data display: `DataTable` (semantic `<table>`, stacked rows < md), `KeyValueList`, `AuditTimeline`
- Decision: `DecisionPanel`, `ConfirmDialog` (**native `<dialog>` + `showModal()`** for focus and inert background), `ReasonField`
- Feedback: `InlineAlert` (`role=alert` for errors, `role=status` for results), `EmptyState`, route-level `loading.tsx` skeletons
- Disclosure and access: `Disclosure` (`<details>`), `RoleRestricted`, `LabBar`, `SegmentedLinks` (status filters as links)

### J.3 Interaction patterns

- Links for navigation, buttons for actions.
- No hover-only information.
- No optimistic financial commits.
- Destructive or consequential actions state the amount.
- Errors sit near their cause.
- All state is server-authoritative after mutations (`router.refresh()` after confirmed response).

### J.4 Responsive

- `≥ lg`: sidebar. `< lg`: top bar + disclosure menu.
- Tables become stacked definition rows below `md`.
- Review actions are sticky on mobile, respecting WCAG 2.4.11 (focus not obscured: scroll padding equals footer height).
- Targets ≥ 44 px for primary actions (≥ 24 px minimum, WCAG 2.5.8).
- Reflow at 320 CSS px (1.4.10), in addition to the 390 px check.

### J.5 Accessibility targets (WCAG 2.2 AA)

1.3.1, 1.4.3, 1.4.10, 1.4.11, 1.4.12, 2.1.1, 2.2.2 (no infinite pulses), 2.4.3, 2.4.6, 2.4.7, 2.4.11, 2.5.8, 3.2.6, 3.3.1, 3.3.3, 3.3.7, 4.1.2, 4.1.3, plus `prefers-reduced-motion` and `prefers-contrast`.

Automated axe scanning requires `@axe-core/playwright` (a new devDependency, HD-20). Without it, keyboard, contrast-token and landmark checks are scripted in Playwright and Vitest.

### J.6 Motion system (no new dependency recommended; HD-26)

**Durations:** `--dur-1` 120 ms (hover, focus, press), `--dur-2` 180 ms (disclosure, expand), `--dur-3` 240 ms (dialog, route), `--dur-4` 400–600 ms (home narrative only).

**Easing:** standard `cubic-bezier(0.2,0,0,1)`, enter `cubic-bezier(0.05,0.7,0.1,1)`, exit `cubic-bezier(0.3,0,0.8,0.15)`.

**Workspace (functional only):**
- Focus and hover feedback.
- Native `<dialog>` fade/scale (opacity/transform only).
- `<details>` expand.
- Route transitions via React `<ViewTransition>` (Chromium 125+ animates; others degrade to instant).
- Budget bar update **after a confirmed 200**, via `transform: scaleX` (no layout shift).
- New audit event fades in after refresh.
- **No** magnetic, tilt or spotlight effects. **No** infinite animations. **No** global pointer listener.

**`/home`:**
- CSS scroll-driven `animation-timeline: view()` and `scroll()` (already used) for reveals and parallax depth (transform only).
- Sticky chapter figure.
- Odometer-style numerals for **illustrative** figures only.
- Content is fully readable with no animation: animations are opt-in under `@supports` and `prefers-reduced-motion: no-preference`.
- No scroll hijacking.

**Budgets:**
- CLS ≤ 0.05; INP ≤ 200 ms on lab hardware; `/home` LCP ≤ 2.5 s.
- No client JS for workspace pages beyond focused islands (decision panel, forms, lab switch).
- Measure baselines in UX-VS-00 first; no numbers are claimed now.

**Dependency evaluation:**
- Motion (Framer) or GSAP would add bundle weight, maintenance and SSR complexity for effects that CSS scroll timelines and `<ViewTransition>` already cover.
- Reconsider only if prototype W-09 demonstrates a needed effect CSS cannot express.

---

## K. Architecture and dependency decisions

**Must remain untouched:**
- Domain, application and infrastructure boundaries and ESLint rules (unless HD-19)
- `decide()` write path, `create()`, migrations `0000–0003`, schema
- API contracts and error codes
- Session derivation; idempotency semantics (same payload → same key; changed payload → new key)
- Formal model; `slice-checks.json`; CI workflows; PRD/SPEC content
- Starter overlay file set; spoiler guards

**Changes:**

| Change | Zone | Approval |
| --- | --- | --- |
| `src/app` route groups, shell, `_ui` primitives, `_lib` view-models (pure `.ts`, Vitest-tested) | Dumb | Plan approval |
| `/` and `/overview` redirects via page-level `redirect()` (no `next.config`) | Dumb | HD-10 |
| Remove `PointerEffects` from root layout; `ParallaxStage` confined to `/home` | Dumb | Plan approval |
| Pure `parseUsdInput(text): MoneyMinor \| error` in `src/modules/procurement/domain/money-input.ts` (string arithmetic only, so the ESLint float ban applies; fast-check properties). The server's `amountMinor` validation remains authoritative. | Smart (domain) | Plan approval |
| **Read models:** port `ProcurementReadModel` in `application/read-models.ts` (`listAuditEvents(actor,{limit,before})`, `listCommitments(actor)`; APPROVER/AUDITOR only; REQUESTER → forbidden) + **new** `infrastructure/postgres-read-models.ts` (baseline tables only; `WHERE tenant_id = actor.tenantId`; `LIMIT`; joins `users` for actor names) + composition `src/server/procurement/read-models.ts`. Server components only; no new HTTP routes unless needed. | Smart (tenant isolation) | Approved in principle; tests in `tests/security/` need HD-18 |
| Client decision state machine as a pure reducer (`_lib/decision-machine.ts`) shared by the decision panel | Smart (idempotency UX) | HD-12/13 |
| Short reference `requestReference(id, visibleIds)` presentation helper | Dumb | HD-14 |
| Demo seed `scripts/seed-demo.ts` (`lab:seed:demo`) using **application services** (real code paths; invariants hold) on `CC-OPS-01` + Meridian; never touches `CC-ENG-01` | Smart (data) | HD-15 |
| Fonts: add one display family via `next/font/google` | Dumb | HD-08 |
| Optional `@axe-core/playwright` (pinned, ≥ 7 days old) | Dumb | HD-20 |
| Optional ESLint boundary extension to `src/app/**/*.ts` (protected) | Smart | HD-19 |

**Rejected:**
- UI kits (shadcn/MUI)
- Chart libraries (SVG/CSS bullets suffice for real data)
- Motion libraries
- Client data fetching libraries
- Durable `PR-YYYY-NNNN` references in this effort (migration plus starter overlay conflict; separate ADR if wanted)
- Historical trend charts or forecasts (no time-series data model)

---

## L. Vertical slice roadmap

**DAG:**

```text
UX-VS-00 Baseline → UX-VS-00B Truthful signals ─┐
UX-VS-00 → [Prototype phase + human verdict] → UX-VS-01 Design system & shell
UX-VS-01 → UX-VS-02 Home
UX-VS-01 → UX-VS-03 Dashboard & budgets → UX-VS-04 Inbox & review → UX-VS-05 Create & track → UX-VS-06 Audit & disclosure → UX-VS-07 Hardening
UX-VS-02 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Delivery reality:** the workshop is 2026-12-11, 14 days away.
- **Must-have cut line:** 00, 00B, 01, 03, 04, 07-subset.
- **Strongly desired:** 02.
- **Can be partial:** 05, 06.

Each slice uses its own branch from the previous approved slice, a PR for human review and no self-merge.

**Common to every slice:**
- **Architectural boundaries:** presentation is a Dumb Zone; policy stays in the domain and services.
- **Rollback:** revert the slice merge commit. No data migrations exist, so rollback is code-only.
- **DoD:** `docs/architecture/DEFINITION-OF-DONE.md` §1–2, §4, plus the experience checks for that slice.
- **Handoff:** a `handoff` skill doc listing changed files, decisions, evidence paths, SHA, skills read with digests, open items and the next step.

### UX-VS-00 — Baseline and experience contracts

- **Objective:** a revision-bound "before" baseline and experience contracts.
- **Preconditions:** HD-01/02/04 resolved (clean tree).
- **Scope:**
  - Wayfinder map files.
  - Skill lock additions (H).
  - `tests/e2e/experience/baseline.spec.ts`: screenshots across 5 viewports × roles × states (empty, pending, approved, rejected, over-limit, insufficient budget) into `testInfo.outputPath`, so they land in the harness `browser-results/`.
  - Console, network and overflow collectors.
  - Fold metrics (is the primary action in the viewport?) and click counts per journey.
  - Draft `docs/experience/EXPERIENCE-SPEC.md` (PH-UXS-001) and `docs/experience/E2E-CONTRACT.md` (selector migration table).
- **Non-goals:** any UI change.
- **Invariants:** none changed.
- **Tests:** baseline spec passes on the current UI.
- **Runtime evidence:** `bun run verify:all --run-id ux-vs-00-<sha7>` (pass, or honest fail/blocked).
- **Rollback:** delete the added files.

### UX-VS-00B — Truthful financial signals (hotfix, direction-independent)

- **Scope:**
  - Per-cost-centre invariant view-model: `committed ≤ allocated`, and committed reconciles to Σ approved per centre (auditor sees all tenant requests).
  - Remove "INV-02 holds" and "Ledger balanced" success claims; neutral facts plus prominent violation messaging.
  - Remove the lock claim from the decision form.
  - Label hero illustrations; fix the TLA+ overclaim and the "real-time" copy.
- **Red → green:** Vitest `dashboard-metrics` overspent fixture (fails today). Starter rehearsal screenshot of PH-42 overspend.
- **Invariants communicated:** INV-01, INV-02 (communication only).
- **Rollback:** revert.

### UX-VS-01 — Design system and application shell

- **Scope:**
  - Tokens and typography from the approved direction; `_ui` primitives.
  - Route groups; `(workspace)/layout.tsx`.
  - `/dashboard` moves from `/` with the same content; `/` redirect; `/lab` page.
  - Lab bar retaining `.session-state` and the `Lab identity` / `Switch identity` contract.
  - Role-aware nav exposing only existing routes.
  - Remove global pointer effects.
  - Contrast-token Vitest.
- **Non-goals:** dashboard redesign; review redesign.
- **Tests:**
  - E2E navigation contract (redirects, query preservation, back).
  - Existing 4 specs pass unchanged or with documented `goto` updates only.
- **Evidence:** `verify:all`; screenshots at 5 viewports.

### UX-VS-02 — `/home`

- **Scope:**
  - Editorial hero (positioning line).
  - Composed product visualisation labelled "Illustrative scenario".
  - Primary CTA "Enter the lab workspace" → `/lab`; secondary "See how a decision is verified" → `#how`.
  - Chapters 1–5 (submit → review → decide → audit → concurrency) with sticky figure.
  - Capabilities in an editorial layout.
  - Trust section describing *how* verification works; a link to evidence instructions, not badges.
  - Footer attribution.
  - Display font scoped to `(public)`.
- **Tests:**
  - E2E: reduced-motion makes content visible with no running animations.
  - No overflow at 320/390.
  - CTA reachable by keyboard.
  - LCP/CLS measured.
  - `scaffold.spec.ts` readiness check moves to the `/lab` contract (HD-17).

### UX-VS-03 — Dashboard and `/budgets`

- **Scope:**
  - Role compositions (§12).
  - Attention bar.
  - Prioritised queue preview, as a pure prioritiser with Vitest.
  - Ledger band with real per-centre data.
  - Recently decided (from `updatedAt`).
  - Persistent violation banner.
  - `/budgets` page.
- **Visualisations (real data only):**
  - Allocated vs committed vs pending vs available bullets per centre.
  - Utilisation % by centre.
  - Status distribution as a count bar with text.
  - Pending exposure vs available per centre.
- **Tests:** Vitest view-models; E2E per role; fold checks; `procurement-budget.spec.ts` `tr[data-cost-center-code]` contract preserved or migrated per HD-17.

### UX-VS-04 — Approval inbox and purchase review

- **Scope:**
  - `/approvals` master-detail.
  - Review workspace (§13) with `DecisionPanel`, `ConfirmDialog`, `ReasonField`.
  - Decision reducer.
  - Reconciliation on unknown outcome via `GET /api/purchase-requests/:id`.
  - Key persistence per HD-13.
  - Post-decision journey ("Review next request", "Back to approval inbox").
  - Over-limit UX per HD-11.
- **Invariants:** INV-03, INV-04, INV-06, INV-07, INV-10 (preserved, not re-implemented).
- **Tests:**
  - Vitest reducer: key reuse on identical retry; new key on payload change; no success without 200.
  - E2E migration of `decision.spec.ts` and `procurement-budget.spec.ts` (Decision select → buttons) with an **assertion parity table**.
  - New E2E for INSUFFICIENT_BUDGET in the browser (two $7,000 requests vs $10,000 on solution → 409, request stays pending, context refreshed).
  - New E2E lost-response test with Playwright `route.fetch()` then `route.abort()` (commit happens, response lost) → UI reconciles → retry with the same key → exactly 1 commitment and 2 audit events.
  - Keyboard-only approval.
  - `ph42:reproduce` unchanged.
  - `test:concurrency` + `test:security` re-run (no edits).

### UX-VS-05 — Request creation and tracking

- **Scope:**
  - `/requests`, `/requests/new`.
  - Dollar input via `parseUsdInput` (fast-check: round-trip with `formatUsd`, rejects > 2 decimals, negatives, exponent notation, `NaN`, > `MAX_SAFE_INTEGER`).
  - Field-level errors.
  - "What happens next" on the detail page.
  - `lab:seed:demo` (HD-15).
  - E2E title policy (HD-16).
- **Tests:** properties; E2E label migration `Amount (USD cents)` → `Amount (USD)` with an equivalent value assertion (`$12.50`).

### UX-VS-06 — Audit and engineering disclosure

- **Scope:**
  - Read models + `/audit` (feed, filters, commitments ledger).
  - Request "Technical details" disclosure (request ID, event IDs, idempotency explanation, spoiler-free).
  - `/lab` content (PH-42 brief, commands; evidence display per HD-23).
- **Tests:**
  - **Security:** cross-tenant `listAuditEvents` / `listCommitments` return only own-tenant rows; REQUESTER forbidden; no other-tenant names. Location per HD-18.
  - Integration against real PostgreSQL.
  - E2E auditor journey.
  - **Starter packaging typecheck:** package the starter, then `check:static` inside the extracted edition.

### UX-VS-07 — Hardening and release readiness

- **Scope:**
  - Accessibility sweep (`web-design-guidelines` file:line review; axe if HD-20).
  - Full viewport matrix.
  - Performance measurement.
  - Copy-claims audit.
  - Triple-edition rehearsal (`package-workshop.ts` → clean clones → starter `ph42:reproduce` exit 1 with an overspend screenshot; solution `verify:all` exit 0).
  - `verify:formal` regression.
  - Update `README.md` screenshots, `docs/workshop/*` URLs (`/dashboard`, `/lab`), feature-map selectors, RTM drift fix.
  - Remove the `/overview` redirect if agreed.
- **DoD:** full DoD including §5 workshop readiness.

---

## M. Verification matrix

| XR | Requirement (observable) | Deterministic | Browser journey | Financial / persisted proof | Slice |
| --- | --- | --- | --- | --- | --- |
| XR-01 | Approver pending count + primary action in viewport without scrolling at 1440×900 and 1280×720 | — | `toBeInViewport()` on AttentionBar CTA | — | 03 |
| XR-02 | Review reachable in one interaction from the queue | prioritiser Vitest | click count = 1 | — | 03/04 |
| XR-03 | Before confirming: available, request amount, projected, limit shown and equal to server data | view-model Vitest | E2E compares UI values to `GET /api/cost-centers` | DB read in integration | 04 |
| XR-04 | Success shown only after 200 with persisted state | reducer Vitest | E2E status + commitment + audit count via API | `financial_commitments` = 1 | 04 |
| XR-05 | Reject requires a reason | reducer + existing 400 | E2E empty reason blocked | audit `REJECTED` with reason | 04 |
| XR-06 | Insufficient budget: clear conflict, refreshed context, stays PENDING | — | E2E sequential over-budget approvals | committed unchanged | 04 |
| XR-07 | Unknown outcome → reconcile → safe same-key retry, no double commit | reducer Vitest | route-abort-after-fetch E2E | 1 commitment, 2 audit events | 04 |
| XR-08 | Over-limit: approve unavailable with reason; server still 403 | existing security INV-06 | E2E + `page.request` 403 `APPROVAL_LIMIT_EXCEEDED` | state unchanged | 04 |
| XR-09 | Requester sees own requests and status only; no audit | existing | E2E (existing + tracking) | — | 05 |
| XR-10 | Auditor/approver tenant audit feed; requester denied; cross-tenant isolated | security tests | E2E auditor | rows scoped by tenant | 06 |
| XR-11 | `/` and `/overview` redirects preserve query; deep links and back work | — | E2E navigation contract | — | 01 |
| XR-12 | Keyboard-only approve and reject with visible focus; dialog traps and returns focus | — | E2E keyboard | as XR-04 | 04 |
| XR-13 | Reduced motion: no running animations; all content visible | — | `emulateMedia({reducedMotion:'reduce'})` + `document.getAnimations()` | — | 02/07 |
| XR-14 | No full-page horizontal overflow at 390 and 320 on all routes | — | E2E sweep | — | 01–07 |
| XR-15 | No console errors or failed requests on journeys | — | listeners in experience specs | — | all |
| XR-16 | Integrity signals computed per centre; no static "holds" claims | view-model Vitest | starter rehearsal screenshot | PH-42 snapshot | 00B/07 |
| XR-17 | Cross-tenant detail returns 404 with no title leak | existing | existing E2E | — | all |
| XR-18 | Token contrast thresholds | Vitest parses `styles.css` pairs | — | — | 01 |
| XR-19 | Home understandable without motion; illustrative data labelled; LCP/CLS budgets | — | E2E + PerformanceObserver | — | 02 |
| XR-20 | Lab identity presented as simulation, never sign-in | copy check | E2E text and landmarks | — | 01 |

**Formal and PH-42:**
- `ph42:reproduce` (solution exit 0; starter exit 1) and `verify:formal` run at 00B, 04 and 07 as regressions.
- The UI never claims to prove transactional correctness.

**Status reporting:** PASS / FAIL / BLOCKED / NOT RUN per check, bound to a clean SHA.

**Gherkin seeds** (for `EXPERIENCE-SPEC.md`):

```gherkin
@XAC-01 Scenario: Approver discovers pending work
  Given 3 pending Northstar requests within "northstar-approver" authority
  When the approver opens /dashboard at 1440x900
  Then "3 requests need your decision" and "Review next request" are visible without scrolling
@XAC-02 Scenario: Financial impact is shown before confirmation
  Given CC-OPS-01 available is $25,000.00 and a pending request of $1,250.00
  When the approver chooses "Approve $1,250.00"
  Then the dialog states available $25,000.00, request $1,250.00, projected $23,750.00 and limit $25,000.00
@XAC-03 Scenario: Approval success is shown only after the server confirms
  When the approver confirms and the API returns 200
  Then status "Approved" and the financial commitment appear and the audit trail shows 2 events
@XAC-04 Scenario: Rejection requires a reason
@XAC-05 Scenario: Concurrency conflict recovery (409 INSUFFICIENT_BUDGET refreshes context; request stays Pending decision)
@XAC-06 Scenario: Uncertain outcome is reconciled before retry with the same Idempotency-Key
@XAC-07 Scenario: Limited approver sees authority comparison and cannot approve; server still returns 403
@XAC-08 Scenario: Requester tracks own purchase and sees no audit trail
@XAC-09 Scenario: Auditor inspects tenant audit events; Meridian auditor sees none of Northstar's
@XAC-10 Scenario: Role restrictions hide /approvals and /audit navigation from requesters
@XAC-11 Scenario: "/" redirects by session and "/?status=PENDING" lands on /requests?status=PENDING
@XAC-12 Scenario: Keyboard-only approval
@XAC-13 Scenario: Reduced motion shows all home content without animation
@XAC-14 Scenario: Starter edition shows CC-ENG-01 overcommitted by $4,000.00 after PH-42 reproduction
```

**Usability targets (measured against the UX-VS-00 baseline before any improvement is claimed):**
- Pending work found without searching.
- Primary approval action above the fold on desktop.
- One interaction from queue to review.
- Impact understood before confirmation.
- No overflow at supported widths.
- No unauthorised disclosure.
- No misleading success state.
- Meaningful focus and recovery.

---

## N. Risk register

| ID | Risk | L | I | Mitigation |
| --- | --- | --- | --- | --- |
| R-01 | Uncommitted docs WIP prevents clean-SHA evidence and breaks `verify-specifications` | H | H | HD-01 before UX-VS-00 |
| R-02 | New read models break the starter build (overlaid `postgres-requests.ts` / `schema.ts`) | M | H | New files only, baseline tables only; packaged-starter typecheck in 06/07 |
| R-03 | E2E migration perceived as weakening assertions | M | H | `E2E-CONTRACT.md` parity table; reviewer sign-off; add stronger API-backed checks |
| R-04 | False or overclaimed copy re-introduced | M | H | Copy-claims checklist at every review; claims only from computed state |
| R-05 | Overspent UI untestable on solution (DB CHECK) | H | M | Pure view-model tests + starter rehearsal |
| R-06 | Idempotency regressions in the new decision client | M | H | Pure reducer tests; lost-response E2E; server unchanged |
| R-07 | Screenshot nondeterminism (Windows vs Linux fonts) | H | M | Capture-and-review, not pixel gating (HD-21); fixed fixtures and viewport |
| R-08 | Motion hurts INP on presenter laptops | M | M | Budgets, no global listeners, reduced-motion |
| R-09 | 14-day timeline with human gates | H | H | Cut line (§L); prototype time-box (one session); parallelise 02 with 03 |
| R-10 | Spoilers: UI copy hints at locking or ADR-0003/0004 in starter | M | H | Copy review against `verifyNoStarterSpoilers` intent; spoiler-free lab text |
| R-11 | Skill supply chain / shadowing (global `to-prd`) | M | M | Lock pins, explicit-path reading, digests in handoffs |
| R-12 | Scope creep (inventing escalation routing, notifications, trends) | M | H | Wayfinder Out-of-scope list; nav only for real routes |
| R-13 | Accessibility regressions with dialogs and sticky footers | M | M | Native `<dialog>`; 2.4.11 checks; keyboard E2E |
| R-14 | Demo seed violates INV-01 consistency if written via SQL | L | H | Seed via application services only |
| R-15 | Tenant-wide audit query unindexed by time | L | L | `LIMIT` + existing per-request index; lab scale; no migration |

---

## O. Human decision register

| ID | Decision | Recommendation | Blocks |
| --- | --- | --- | --- |
| HD-01 | Resolve the docs-relocation WIP (commit with reference fixes, or revert) | Your call; must be resolved before 00 | 00 |
| HD-02 | Untracked npm `package-lock.json` | Delete (Bun canonical); needs your confirmation | 00 |
| HD-03 | Replace CLI-installed skills with a pinned bootstrap install, adding `grilling` + `research`; pin revision | Yes; pin to the newest ≥ 7-day-old commit with equal digests, else `6f7f783` | Prototype |
| HD-04 | Remove `ui-ux-pro-max/__pycache__`; helper-script policy | Remove; read data files only | 00 |
| HD-05 | Global `~/.agents/skills/to-prd` shadowing | Keep the explicit-path rule; optionally rename the global copy | — |
| HD-06 | Where Wayfinder artifacts live | `.scratch/` tracked + excluded in `package-workshop.ts` | Map |
| HD-07 | Visual direction A / B / C / hybrid | A + C-editorial home (after prototypes) | 01 |
| HD-08 | Typography | Keep Plex Sans UI; add one display serif for `/home`; mono for IDs only | 01 |
| HD-09 | Dark mode in v1 | Light-only v1 | 01 |
| HD-10 | Route map, `/` redirect semantics, `/overview` fate, `/procurement-hub` | As §F; no alias | 01 |
| HD-11 | Over-limit Approve | Unavailable with explanation + browser API assertion of 403 | 04 |
| HD-12 | Confirmation form | Native dialog for Approve; inline required reason + confirm for Reject | 04 |
| HD-13 | Persist the decision key across reload (sessionStorage) | Yes, scoped to request + payload, cleared on terminal state | 04 |
| HD-14 | Human-readable reference | Presentation-only short ref; durable PR numbering as a later ADR | 03 |
| HD-15 | Demo dataset | `lab:seed:demo` via services on CC-OPS-01 + Meridian | 05 |
| HD-16 | E2E data policy | E2E runs only on isolated harness DBs; titles keep a short unique suffix | 05 |
| HD-17 | Approve the E2E selector/route contract changes (listed in `E2E-CONTRACT.md`) | Yes, with parity table | 01–05 |
| HD-18 | New tests under protected `tests/security/` for read models | Yes (strengthening; flagged) | 06 |
| HD-19 | Extend the ESLint UI boundary to `src/app/**/*.ts` | Yes, separate reviewed change | — |
| HD-20 | Add `@axe-core/playwright` devDependency | Yes, pinned and ≥ 7 days old | 07 |
| HD-21 | Visual regression approach | Capture-and-review manifests; no pixel gating v1 | 00 |
| HD-22 | Glossary alignment ("Workspace", "Review", "headroom") | Align UI copy to the glossary; amend the glossary only via the domain-modeling skill | 01 |
| HD-23 | `/lab` shows local verification evidence | Commands + how to read evidence; no pass badges | 06 |
| HD-24 | Escalation hint names higher-limit approvers | No names in v1 (generic hint) | 04 |
| HD-25 | Update facilitator/participant guides, slides, README in UX-VS-07 | Guides + README yes; slides only if screenshots appear | 07 |
| HD-26 | Motion dependency | None | 02 |
| HD-27 | Push prototype or slice branches | No, unless you explicitly ask | — |

---

## P. Wayfinder decision map (local) and next-session handoff

### P.1 Map file and tickets

The map lives at `.scratch/ux-transformation/map.md`, created in the prototype-phase session after HD-03/06.

- **Destination:** an approved enterprise product experience specification (PH-UXS-001), supported by interactive prototypes, a design system, role-specific journeys and an implementation-ready verification plan.
- **Notes:** skills to read by path (§H.6); glossary; Trust Pyramid; no publishing or pushing; one ticket per session (except research).

| # | Ticket | Type | Blocked by |
| --- | --- | --- | --- |
| 01 | Capture revision-bound UX baseline | task (AFK) | HD-01, 02, 04 |
| 02 | Verify audit findings F-01 to F-18 at runtime | research | 01 |
| 03 | Inspect benchmark sites' rendered interactions | research | — |
| 04 | Choose creative direction | grilling (HITL) | 02, 03, 08 |
| 05 | Colour and typography tokens | grilling | 04 |
| 06 | Information architecture and routing | grilling | 02 |
| 07 | Home narrative | prototype (UI) | 04, 06 |
| 08 | Workspace variants A/B/C (dashboard, inbox, review) | prototype (UI) | 01, 06 |
| 09 | Motion strategy | research → grilling | 07 |
| 10 | Dashboard composition per role | grilling | 08 |
| 11 | Inbox interaction and prioritisation | grilling | 08 |
| 12 | Decision state machine and failure contract | prototype (LOGIC) | 11 |
| 13 | Human-readable identifiers | grilling + domain-modeling | 02 |
| 14 | Financial visualisation | grilling | 10 |
| 15 | Accessibility targets and tooling | research → grilling | 05 |
| 16 | Technical architecture boundaries (read models, starter overlay) | grilling | 06 |
| 17 | Dependency strategy | research | 09, 15 |
| 18 | Verification strategy and E2E contract | grilling | 06, 12 |
| 19 | Workshop packaging compatibility | research | 06, 16 |
| 20 | Demo dataset | grilling | 13 |

- **Not yet specified (fog):** dark mode post-v1; print/export; durable PR numbering ADR; mobile-first approvals; locale formats.
- **Out of scope:**
  - Production authentication
  - New write capabilities (budget editing, delegation, multi-step approvals, escalation routing)
  - Notifications
  - Forecasting or trends
  - Multi-currency
  - Schema migrations
  - Publishing issues
  - Pushing branches

These are decision tickets. Production work happens only in the UX-VS slices.

### P.2 Next-session prompt (prototype phase)

> **Session: Procurement Hub — UX prototype phase (throwaway).**
>
> **Preconditions:**
> - HD-01, HD-02, HD-03, HD-04 and HD-06 are resolved and the tree is clean.
> - Start from `feat/ui-ledger-indigo` (or the clean successor SHA) and create the local branch `prototype/ux-variants`. Do not push.
>
> **Read by explicit path and record SHA-256 digests:**
> - `AGENTS.md`, `doc-specs/PRD.md` or `PRD.md` (whichever HD-01 chose), `docs/domain/GLOSSARY.md`
> - `.agents/skills/prototype/{SKILL.md,UI.md,LOGIC.md}`, `.agents/skills/wayfinder/SKILL.md`, `docs/workflows/WAYFINDER-LOCAL-TRACKER.md`
> - `.agents/skills/ui-taste/reference/{operate.md,new-work.md,anti-slop-craft.md}`, `.agents/skills/web-design-guidelines/references/command.md`
> - This plan (§C–§J)
>
> **Work** Wayfinder ticket **08 (Workspace variants)** only. Follow `prototype/UI.md` sub-shape A:
> - Three structurally different variants (A Institutional Command Center, B Approval-First, C Editorial) on the existing routes `/` (signed-in), `/requests/[id]` and `/overview`, selected by `?variant=`.
> - Use a floating switcher gated by `NODE_ENV !== 'production'` and lab mode.
> - Files go in `src/app/_prototype/*.prototype.tsx`.
> - Read-only real data via existing services. **Approve and Reject buttons are stubs that never call `/api/purchase-requests/:id/decision`.** Clearly labelled stub rows for audit regions.
> - No auth, schema, API or test changes.
> - Apply the anti-slop rules: no card grids, no glow, no tilt or magnetic effects, mono only for IDs, figures with `tabular-nums`.
> - Use the Direction A tokens for A and B, and C's palette for C, as defined in §D.2.
>
> **Capture:**
> - Screenshots of every variant × surface at 1920×1080, 1440×900, 1280×720, 768×1024 and 390×844 into `artifacts/ui-review/prototype-<sha>/` (gitignored).
> - Console errors and overflow per capture.
> - Click counts for tasks T1–T6.
>
> **Hand over:** URLs with `?variant=` keys, the capture index, a comparison table, and limitations stated honestly (e.g. no image-generation target, unverified browsers).
>
> **Stop** at the human verdict. Record it in `.scratch/ux-transformation/issues/08-workspace-variants.md` under `## Answer` (winner per surface plus steal list). Commit the prototype to the local throwaway branch only. Do not start UX-VS-01.
>
> **Bounded loop:** `loop:run`, max 3 iterations, 900 s; escalate on any scope or safety conflict.

### P.3 Bounded loop per production slice

This maps onto `engineering/loop-runner.ts`:
1. `init --run-id ux-vs-0N-<sha7> --max-iterations 3 --max-consecutive-failures 2 --time-budget-seconds 900`.
2. Load the spec and the skills by path.
3. Run baseline checks.
4. Define the oracle (XR rows for the slice).
5. Write failing Vitest/E2E.
6. Implement the smallest change.
7. Run `check:static` → `verify:architecture` → `test:unit` → `test:properties` → `test:integration` / `test:security` (06) → `test:e2e`.
8. Drive the browser (experience specs).
9. Inspect captures against the target.
10. List discrepancies, then make a new hypothesis and fix (no rerun of an unchanged failing command).
11. Reverify.
12. Apply `clean-code`.
13. Apply `code-review-and-quality`.
14. Run `verify:all --run-id …` on a clean SHA.
15. Write the handoff.
16. Stop at human PR review.

Protected-path edits (HD-18/19) require `--allow-protected` plus explicit human approval.
