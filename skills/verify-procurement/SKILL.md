---
name: verify-procurement
description: Launch, check, exercise, and clean up an isolated Procurement Hub lab. Use when rehearsing the workshop, verifying a candidate revision, or collecting reproducible evidence for PH-42.
---

# Verify Procurement Hub

Use a clean Git checkout, Node.js 24.22.3, npm 11.19.1, Python 3 and either local Docker Compose v2 or local PostgreSQL executables. Run `npm ci` and `npx playwright install chromium` from the repository root. An installed compatible browser can be selected with `WORKSHOP_CHROMIUM_PATH`.

## Launch

```bash
npm run verify:all -- --run-id workshop-rehearsal
```

The command builds the candidate, allocates local ports, starts its own isolated database, applies tracked migrations, seeds synthetic identities, and starts a loopback app. Use a local Docker context. To use local PostgreSQL, supply the directory with `initdb` and `postgres`:

```bash
npm run verify:all -- --run-id workshop-rehearsal --postgres-bin /path/to/postgresql/bin
```

When using the Windows Python launcher, run `py -3 engineering/verify-lab.py --run-id workshop-rehearsal`. The harness gives the build 180 seconds, Compose database readiness 60 seconds, and the app listener 40 seconds.

## Doctor

The harness runs `npm run lab:doctor -- --db-only` and then the app-ready check equivalent to `npm run lab:doctor`. It uses a read-only transaction to confirm the lab database, two tenants and the four identities needed by the feature map. It checks `GET /api/health` for HTTP 200 and anonymous `GET /api/purchase-requests` for HTTP 401. Sign-in and role-specific access run during the HTTP and browser checks.

For individual scenarios, follow the [manual startup order](../../README.md#run-the-lab). The standalone doctor commands inherit the manual lab configuration.

## Drive

Use the [feature map](features/README.md) to select a scenario, its expected observations and exact browser or HTTP commands. The full run executes the VS-04 checks in [the registry](../../engineering/slice-checks.json). A browser or app failure leaves a failing run with diagnostic evidence. For a repeat run, use a new ID so the prior evidence remains available.

## Evidence

Open `artifacts/verification/VS-04/<run-id>/lifecycle/manifest.json` for the revision, stage outcomes, observed PH-42 results and log paths. Open `attempt-0/manifest.json` in the same run directory for the individual commands and exit codes. The snapshot should show HTTP 201 and 201, two IDs and two creation events, with exit 1. The live API should show HTTP 200 and 201, one ID and one creation event, with exit 0.

Playwright keeps diagnostic output for each run under `browser-results/`. Keep raw traces local and limit shared evidence to synthetic counts, statuses and sanitized logs. A successful local run exits 0, a failed check or dirty candidate exits 1, and a blocker exits 2. Review both manifests before claiming the required checks passed.

## Cleanup

The one-shot command stops the app and removes its own temporary PostgreSQL cluster or uniquely named Compose project and volume. Confirm the cleanup stage passed and that both manifests still open. For a manually started lab, stop the app with Ctrl+C and use `npm run lab:down`; the manual database volume is retained.
