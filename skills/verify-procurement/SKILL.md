---
name: verify-procurement
description: Launch, check readiness, exercise user and API journeys, collect revision-bound financial/runtime evidence, and tear down an isolated Procurement Hub lab. Use when reproducing PH-42, verifying a candidate revision, or running end-to-end runtime proof.
---

# Verify Procurement Hub

Portable, repository-local runtime verification skill for **Procurement Hub** (independent adaptation of Lauren Tan's `pstack` `create-verification-skill` contract). Designed to be executed cold by any engineer or coding agent using standard terminal commands.

---

## Environment Requirements

- **Runtime & package manager:** Bun `1.4.5` (`bun.lock`, `bun install --frozen-lockfile`)
- **Database engine:** Local Docker Compose v2 (`postgres:18.7`) OR standalone local PostgreSQL binaries via `--postgres-bin <bin-dir>`
- **Browser engine:** Playwright Chromium (`bun run browser:install`, or set `WORKSHOP_CHROMIUM_PATH`)
- **Isolation:** Loopback only (`127.0.0.1`), disposable database `procurement_hub_lab`, `WORKSHOP_LAB_MODE=enabled`. Never run against non-loopback or production databases.

---

## Launch

### Isolated One-Shot Harness (Recommended)

```bash
bun run verify:all --run-id workshop-rehearsal
```

Allocates ephemeral loopback ports, builds the Next.js candidate (`180s` timeout), starts an uniquely named disposable PostgreSQL 18.7 Compose project (`60s` readiness timeout), applies all tracked Drizzle migrations, seeds 2 tenants, 9 synthetic identities, and 3 Cost Centers, and starts the built Next.js server (`40s` listener timeout).

For standalone local PostgreSQL (without Docker):

```bash
bun run verify:all --run-id workshop-rehearsal --postgres-bin /path/to/postgresql/bin
```

To verify the defective starter baseline (where `ph42:reproduce` is expected to fail with exit `1`):

```bash
bun run verify:all --slice starter --run-id starter-check
```

### Manual Interactive Launch (For Live Exploration / Debugging)

```bash
cp .env.example .env      # PowerShell: Copy-Item .env.example .env
bun run lab:bootstrap     # Starts Docker PostgreSQL, applies migrations, seeds, runs db doctor
bun run dev               # Terminal 2: Next.js loopback server at http://127.0.0.1:3000
```

---

## Doctor

Read-only diagnostic check confirming the environment is worth driving before running tests:

```bash
bun run lab:doctor --db-only   # Checks PostgreSQL 18, database name, 2 tenants, 7 core identities, 3 Cost Centers
bun run lab:doctor             # Also checks GET /api/health == 200 {"status":"ready"} and anonymous 401 on /api/purchase-requests & /api/cost-centers
```

Expected output: JSON containing `"status": "pass"` and exit code `0`. Exit code `2` indicates an environment blocker (database down, missing migrations/seed, or `WORKSHOP_LAB_MODE` disabled).

---

## Drive

Select the relevant user-POV journey from the **[Feature Map Index](features/README.md)** (8 mapped features covering `INV-01`–`INV-10`).

### Primary Targeted Commands

| Purpose | Command |
| --- | --- |
| Static types & ESLint | `bun run check:static` |
| Enforceable architectural boundaries | `bun run verify:architecture` |
| Unit & domain invariant tests (Vitest) | `bun run test:unit` |
| PostgreSQL integration & migration tests | `bun run test:integration` |
| Live PH-42 concurrent approval reproduction (`$7k + $7k` vs `$10k`) | `bun run ph42:reproduce` |
| Concurrency test suite (multi-connection HTTP & retries) | `bun run test:concurrency` |
| Security & tenant isolation regression suite | `bun run test:security` |
| Property-based tests (`fast-check`, pinned seed) | `bun run test:properties` |
| Browser end-to-end journeys (Playwright Chromium) | `bun run test:e2e` |
| Seed clean `$10,000` PH-42 browser scenario (`CC-ENG-01`) | `bun run lab:seed:ph42` |
| Reset disposable database to clean seeded baseline | `bun run lab:reset` |

Use stable ARIA roles and labels (`Lab identity`, `Cost center`, `Title`, `Justification`, `Amount (USD cents)`, `Decision`, `Save decision`) and public HTTP endpoints (`/api/cost-centers`, `/api/purchase-requests`, `/api/purchase-requests/:id/decision`, `/api/purchase-requests/:id/audit`). Never substitute mocked database state for PostgreSQL evidence.

---

## Evidence

Every one-shot harness run writes an immutable, revision-bound evidence bundle under `artifacts/verification/<run-id>/`:

- `manifest.json` — Machine-readable manifest: exact `candidateSha`, `candidateTree`, `worktreeDirty`, runtime/DB versions, stage timings, check statuses/exit codes, before/after PostgreSQL budget snapshots, HTTP responses, property seed, and artifact paths.
- `summary.md` — Human-readable executive summary for PR reviewers linking every check to its invariant (`INV-01`–`INV-10`).
- `attempt-0/` — Individual stdout/stderr logs for every check.
- `browser-results/` — Playwright screenshots and traces captured during E2E execution.

### Proof Standards

1. Exercise public HTTP and browser interfaces, then corroborate side effects with read-only PostgreSQL observations (`cost_centers`, `financial_commitments`, `purchase_requests`, `audit_events`, `decision_idempotency_keys`).
2. Never claim a check passed unless it actually ran and exited with its expected code on a clean Git revision (`worktreeDirty: false`).
3. Keep raw session cookies, credentials, and unsanitized traces out of commits and shared artifacts.
4. Confirm `manifest.json` and `summary.md` still exist on disk **after** Cleanup completes.

---

## Cleanup

- **One-shot harness (`verify:all`):** Automatically sends `SIGTERM` (then `SIGKILL` after 10s) to the exact Next.js PID it spawned and runs `docker compose -p <unique-project> down --volumes` (or removes its temp PostgreSQL cluster). Never kills processes globally by name. **Preserves `artifacts/verification/<run-id>/`.**
- **Manual lab:** Press `Ctrl+C` in the `bun run dev` terminal and run `bun run lab:down`. To clear disposable test rows while keeping the container running, use `bun run lab:reset`.

---

## Helpers

| Helper Script | Invocation | Purpose |
| --- | --- | --- |
| `engineering/verify-lab.ts` | `bun run verify:all --run-id <id>` | Full launch -> doctor -> drive -> evidence -> cleanup lifecycle |
| `scripts/lab-doctor.ts` | `bun run lab:doctor [--db-only]` | Read-only DB & app health/auth-boundary check |
| `scripts/reproduce-ph42.ts` | `bun run ph42:reproduce [--isolated]` | Deterministic live concurrent `$7k + $7k` vs `$10k` approval check with before/after DB snapshot |
| `scripts/verify-architecture.ts` | `bun run verify:architecture` | Proves ESLint rejects forbidden imports across all 4 layers |
| `scripts/seed-ph42.ts` | `bun run lab:seed:ph42` | Seeds clean `$10,000` `CC-ENG-01` + Request A & B (`$7,000` each) for browser inspection |
| `scripts/reset-lab.ts` | `bun run lab:reset` | Resets disposable lab rows cleanly without dropping schema |

---

## Troubleshooting

- **`The checkout already has a lab run in progress.`** Another `verify:all` run holds `artifacts/verification/.active`. Wait for it to finish, or verify no harness process is running and remove the stale empty directory.
- **`Select a local Docker context before running the lab.`** Run `docker context ls` and switch to `default` / `desktop-linux` (`docker context use default`).
- **`blocked` in `lab:doctor`:** Ensure `.env` exists (`WORKSHOP_LAB_MODE=enabled`), PostgreSQL is running (`bun run lab:up`), and Next.js is listening on `WORKSHOP_BASE_URL` (`http://127.0.0.1:3000`).
- **Windows Chromium path:** Run `bun run browser:install` or set `WORKSHOP_CHROMIUM_PATH` to a local Chromium binary.
- **Dirty worktree exit `1`:** `verify:all` requires a clean committed revision for final acceptance (`worktreeDirty: false`). Commit your scoped changes and re-run with a fresh `--run-id`.

---

## Success and Failure Criteria

- **Exit `0` (`pass`):** All 5 stages (`launch`, `doctor`, `drive`, `evidence`, `cleanup`) passed on a clean revision (`worktreeDirty: false`), `manifest.json` + `summary.md` exist post-cleanup, and live PH-42 invariants hold (or fail as expected when `--slice starter`).
- **Exit `1` (`fail`):** One or more checks failed, invariants were violated, or `worktreeDirty: true`. Inspect `summary.md` and `attempt-0/*.log`.
- **Exit `2` (`blocked`):** Missing prerequisite (Docker, Chromium, invalid run ID, or reused run ID). Resolve the environment blocker before retrying with a new `--run-id`.
