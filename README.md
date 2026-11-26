<div align="center">

# GrokBot for Enterprise Engineering Workflows

### From Issue to Verified Pull Request

**Packt Advanced Workshop · December 11, 2026 · 60 minutes**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.4.5-252529?logo=bun&logoColor=white)](https://bun.sh/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Reveal.js](https://img.shields.io/badge/Reveal.js-6-F2E142?logo=revealdotjs&logoColor=black)](https://revealjs.com/)

Take a concurrency bug in a purchase approval system from a reproducible symptom to a pull request a reviewer can verify independently.

**[Run Procurement Hub](#run-the-lab) · [Open the slide guide](slides/README.md) · [Try PH-42](#check-ph-42) · [Review the evidence](#review-the-pull-request)**

</div>

---

## Start here

| I want to… | Where to go |
| --- | --- |
| **Follow the presentation** | [Preview or download the Reveal.js deck](slides/README.md). GitHub Pages is prepared for the approved release. |
| **Try the application** | [Run Procurement Hub locally](#run-the-lab) and complete a request, a decision and an audit review. See the [hosted demo plan](doc-specs/08-online-workshop.md) for the interactive preview. |
| **Work through the exercise** | [Read PH-42](doc-specs/03-demo-issue-42.md), then run the historical and live checks. |
| **Explore the engineering design** | [Open the specification pack](doc-specs/README.md) for the PRD, architecture, vertical slices and verification strategy. |

## The case study

**Procurement Hub** is a TypeScript lab for submitting, deciding and auditing purchase requests. It runs with Next.js and a real PostgreSQL database, using synthetic people and two independent tenant workspaces.

In PH-42, two concurrent submissions with the same idempotency key could create two purchases and two creation events. That can put the same expense through approval twice. You will trace the invariant across the HTTP response, persisted records and audit trail, then prepare the evidence needed for someone else to review the fix.

![Procurement Hub running locally with a synthetic purchase request and an audit trail containing CREATED and APPROVED events](docs/media/procurement-hub.webp)

*Procurement Hub after a Northstar requester submits a purchase and an approver records the decision.*

## What you’ll practice

- Turn a bug report into observable acceptance criteria that a person and an agent can use.
- Identify where the application enforces tenant scope, role permissions and persistence invariants.
- Give GrokBot a bounded task, run the verification harness against the live application and use its findings to guide the next action.
- Open a pull request with evidence tied to the candidate commit so a human reviewer can compare it against independent CI.

### Session agenda

| Time | Topic | Activity |
| --- | --- | --- |
| 00–05 | The business case | Trace a duplicate purchase from submission to audit. |
| 05–12 | Enforceable architecture | Find the boundaries for role, tenant and database writes. |
| 12–20 | Verification harness | Identify the fastest checks and the scenario that needs a live database. |
| 20–40 | GrokBot walkthrough | Reproduce the symptom, diagnose the cause and verify the candidate. |
| 40–48 | Evidence and review | Match the candidate SHA, CI run and PR evidence. |
| 48–53 | Optional extension | Explore the bounded model or trace the live evidence in more depth. |
| 53–60 | Q&A | Discuss what the workflow would require in your own codebase. |

## Run the lab

Use **[Bun 1.4.5](https://bun.sh/)**, **Docker Compose v2** and a terminal. The application and disposable PostgreSQL database listen on loopback. The example configuration enables the workshop’s synthetic role selector.

1. Copy `.env.example` to `.env` with `cp .env.example .env` in Bash or `Copy-Item .env.example .env` in PowerShell.
2. Install the locked dependencies, install Chromium for the browser tests and start the lab.

   ```bash
   bun install --frozen-lockfile
   bun run browser:install
   bun run lab:up
   bun run lab:doctor --db-only
   bun run dev
   ```

3. Open [Procurement Hub at 127.0.0.1:3000](http://127.0.0.1:3000). Choose **Northstar Requester**, submit a purchase and open it from **My requests**.
4. Return to the home page, choose **Northstar Approver**, open the same request and record a decision.
5. Switch to **Northstar Auditor** to check the creation and decision events. You can also return as the requester to inspect the final status, then switch to **Meridian Requester** to explore the separate workspace.

Run `bun run lab:doctor` in another terminal. A healthy app returns HTTP 200 with `{"status":"ready"}`. Readiness checks PostgreSQL and, with lab mode enabled, the seeded identities.

<details>
<summary>Local setup, individual tests and cleanup</summary>

- `bun run lab:up` starts the database, applies the migrations and seeds the synthetic identities. Use `bun run lab:init` for an existing disposable lab database. Re-running setup preserves existing requests.
- Run `bun run check:static` and `bun run test:unit` for fast feedback. Run `bun run test:integration` and `bun run test:e2e` against the disposable dataset. The tests create synthetic records with unique keys.
- Set `WORKSHOP_BASE_URL` for a different local app port or `WORKSHOP_CHROMIUM_PATH` for a compatible installed Chromium. Use `bun run build` followed by `bun run start` to exercise a prebuilt app.
- Stop the application with Ctrl+C and run `bun run lab:down` for the owned Compose lab. The volume and local evidence are retained. For simultaneous checkouts, use separate Compose projects and ports.
- Leave `WORKSHOP_LAB_MODE` unset to disable the synthetic sessions.

</details>

## Check PH-42

With the healthy local lab running, issue each command separately.

| Command | Evidence source | Expected result |
| --- | --- | --- |
| `bun run verify:ph42-fixture` | Synthetic historical observation loaded into PostgreSQL | Simulated HTTP 201 and 201, different IDs, two requests and two creation events. Expected exit **1**. |
| `bun run verify:concurrency` | Two equivalent submissions to the running API, checked in PostgreSQL | Observed HTTP 200 and 201, the same ID, one request and one creation event. Expected exit **0**. |

PH-42 is complete when equivalent submissions converge on one logical purchase, one creation event and the same request ID. Check the full [issue and acceptance criteria](doc-specs/03-demo-issue-42.md) for conflicting payloads, tenant isolation and other regression paths.

### Verify the lab in one run

From a clean checkout with Bun, Docker Compose and Chromium available, use a fresh run ID.

```bash
bun run verify:all --run-id workshop-rehearsal
```

The harness builds the app, starts disposable PostgreSQL, checks readiness, runs the suites and records both PH-42 observations. It cleans up the resources it created and retains lifecycle and check manifests under `artifacts/verification/VS-04/<run-id>/`.

For the reference checks, add `--slice VS-05` and read the evidence under `artifacts/verification/VS-05/<run-id>/`. See the [verification guide](skills/verify-procurement/SKILL.md) for Windows, standalone PostgreSQL and individual scenarios. The optional [bounded formal exercise](formal/README.md) uses a separate model and evidence set.

## Explore the code

| Area | What to look for |
| --- | --- |
| [Next.js application](src/app/) | Request pages, lab identity selection and API entry points. |
| [Procurement module](src/modules/procurement/) | Role and ownership checks, decision rules and persistence. |
| [Database and migrations](drizzle/) | Tenant-scoped schema, constraints and migration history. |
| [Tests](tests/) and [verification harness](engineering/verify-lab.ts) | Unit checks, PostgreSQL integration, Chromium journeys and run evidence. |
| [Vertical slices](doc-specs/05-vertical-slices.md) and [handoffs](doc-specs/handoffs/) | Scope, delivery sequence and completed verification by slice. |

## Review the pull request

1. Compare the issue’s acceptance criteria against the change and identify the behaviors that need evidence.
2. Use the [PR template](.github/pull_request_template.md) to record the candidate SHA, checks actually run, artifact paths and any remaining limitations.
3. Match the same SHA in **Workshop verification** and inspect the `workshop-evidence-*` artifact. Check both PH-42 outcomes and the live database counts.
4. Review the change and evidence before approving delivery. The [release rehearsal](doc-specs/07-release-rehearsal.md) shows how to verify the participant starter and instructor bundle independently.

## Workshop slides and live application

[Reveal.js](slides/README.md) brings the walkthrough, commands and English and Portuguese speaker notes together. The **Workshop slides** workflow builds the deck and makes it available as a ZIP. It also provides the GitHub Pages publication path for the reviewed deck.

The interactive Procurement Hub needs a server and a PostgreSQL database. The [online workshop plan](doc-specs/08-online-workshop.md) documents GitHub Pages for the slides and the isolated Vercel preview for the app. The local walkthrough is available today.

## Authoring and attribution

This private authoring repository contains instructor material. Use the [release rehearsal](doc-specs/07-release-rehearsal.md) to prepare participant-safe content with isolated Git history. See [slice execution](doc-specs/LOOP-ENGINEERING.md) for revision-linked verification, authoring setup and review.

This independent adaptation was inspired by Lauren Tan’s [All Code Is Slop (Except Mine)](https://www.youtube.com/watch?v=O_zcc6Xl12g) and [pstack](https://github.com/cursor/plugins/tree/main/pstack).

---

## About the presenter

<div align="center">
  <a href="https://github.com/glaucia86"><img src="docs/media/glaucia-lemos.jpg" width="170" height="170" alt="Glaucia Lemos"></a>
  <h3>Glaucia Lemos</h3>
  <p>Principal Software Engineer · Developer Educator · OpenAI Codex Ambassador</p>
  <p><a href="https://github.com/glaucia86">GitHub</a> · <a href="https://www.linkedin.com/in/glaucialemos/">LinkedIn</a> · <a href="https://www.youtube.com/user/l32759">YouTube</a></p>
</div>
