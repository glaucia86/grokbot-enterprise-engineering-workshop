# GrokBot for Enterprise Engineering Workflows

**From Issue to Verified Pull Request**

Packt Advanced Workshop · December 11, 2026 · 60 minutes

## Procurement Hub

A synthetic enterprise purchase request and approval platform for demonstrating verification-first agentic engineering with GrokBot. The lab includes purchase submission, approval, audit, and a repeatable verification harness.

## Start here

- [Product and technical specification pack](doc-specs/README.md)
- [Implementation plan and vertical slices](doc-specs/05-vertical-slices.md)

## Authoring and release

Keep this repository private during preparation. The specification pack contains instructor-facing design details and the reference solution ADR. Before public release, prepare a participant-facing starter with no instructor-only content in its reachable history. Branch separation alone is not an access control. Do not commit credentials, real customer data or private presenter notes.

The [release rehearsal](doc-specs/07-release-rehearsal.md) prepares self-contained starter and solution bundles with isolated Git history. GitHub Actions runs the reference checks on the exact pull request head and retains a sanitized evidence manifest.

## Attribution

Inspired by Lauren Tan's [All Code Is Slop (Except Mine)](https://www.youtube.com/watch?v=O_zcc6Xl12g) and [pstack](https://github.com/cursor/plugins/tree/main/pstack). This workshop is an independent adaptation of those principles to GrokBot. See the specification index for source and license guidance.

## Run the lab

Procurement Hub provides a synthetic workspace for submitting and inspecting purchase requests. See [the slice handoffs](doc-specs/handoffs/) for capability and test results.

Use Bun 1.4.5 and Docker Compose v2. Install a Chromium browser for Playwright, and copy `.env.example` to `.env` (`cp .env.example .env` in Bash or `Copy-Item .env.example .env` in PowerShell). The database and application bind to loopback. The sample environment explicitly enables the synthetic identity selector.

```bash
bun install --frozen-lockfile
bun run browser:install
bun run lab:up
bun run lab:doctor --db-only
bun run dev
```

While the dev server is running, open `http://127.0.0.1:3000`. Select the Northstar Requester, submit a purchase and open it from **My requests**. From the home page, switch to the Northstar Approver, open the same request and record an approval or rejection. Switch to the Northstar Auditor to see both events, then return as the requester to inspect the final status. Switch to the Meridian Requester to see the other tenant's workspace.

`bun run lab:up` applies the tracked migrations and seeds synthetic identities after PostgreSQL becomes ready. For an existing disposable loopback lab database, run `bun run lab:init` to apply the same migration and seed. Re-running setup preserves existing procurement records. Leave `WORKSHOP_LAB_MODE` unset to disable synthetic sessions.

From another terminal run:

```bash
bun run lab:doctor
bun run check:static
bun run test:unit
bun run test:integration
bun run test:e2e
```

A healthy lab returns HTTP 200 with `{"status":"ready"}`. Missing or unreachable PostgreSQL returns HTTP 503. With lab mode enabled, readiness also requires seeded identities. Set `WORKSHOP_BASE_URL` for a different local app port, or `WORKSHOP_CHROMIUM_PATH` to use a compatible installed Chromium executable. For a prebuilt run, use `bun run build` followed by `bun run start`. Run the integration and browser tests against the disposable workshop dataset. They create synthetic requests with unique keys.

Stop the application with Ctrl+C and run `bun run lab:down` for the owned Compose lab. This stops the containers and retains the volume and local verification evidence. If another checkout is using the project name or ports, isolate the Compose project and configure separate ports before starting it.

For authoring setup and revision-linked checks, see [slice execution](doc-specs/LOOP-ENGINEERING.md). The optional authoring skill bootstrap uses Bun and HTTPS access to the pinned sources.

## Verify the lab in one run

From a clean Git checkout, install dependencies and Chromium as shown above. With Bun and local Docker Compose v2 available, run:

```bash
bun run verify:all --run-id workshop-rehearsal
```

The harness builds the app, starts an isolated PostgreSQL instance, checks readiness, runs the test suites and both PH-42 observations, then removes the resources it created. Use a fresh run ID each time. Read the lifecycle and check manifests under `artifacts/verification/VS-04/<run-id>/` after shutdown. For a local PostgreSQL installation, Windows invocation and individual scenarios, see [the verification guide](skills/verify-procurement/SKILL.md).

## Check PH-42

With the lab profile enabled, run the two checks separately. The fixture reports the expected failing historical observation with exit 1. The live check uses the running API and disposable PostgreSQL with exit 0 when the invariant holds.

```bash
bun run verify:ph42-fixture
bun run verify:concurrency
```

See the [PH-42 exercise](doc-specs/03-demo-issue-42.md) for the expected responses and persisted counts.

## Optional formal extension

Run generated contract tests with `bun run test:properties`. The [bounded PH-42 exercise](formal/README.md) pairs a TLA+ counterexample with an exhaustive check of the atomic model over its configured states. Its evidence is separate from the real HTTP and PostgreSQL run.
