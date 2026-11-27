---
name: verify-<app>
description: Launch, check readiness, exercise user/API journeys, collect revision-bound evidence, and clean up an isolated <App> environment.
---

# Verify <App>

## Environment Requirements
- Runtime: `<pinned version>`
- Backing services: `<Docker Compose / local DB>`
- Browser / driver: `<Playwright / HTTP client>`

## Launch
```bash
<one-shot launch or verify command>
```
Ready means the database has migrated + seeded AND `/api/health` returns `200`, not merely that a port accepted TCP connections.

## Doctor
```bash
<read-only doctor command verifying DB schema, seed, health endpoint, and unauthenticated 401>
```

## Drive
Select target scenarios from `features/README.md`. Exercise real public routes/UI — never mock database persistence when proving transactional invariants.

## Evidence
Retain immutable evidence under `artifacts/verification/<run-id>/`:
- `manifest.json` (exact `git rev-parse HEAD`, `worktreeDirty: false`, exit codes, DB snapshots)
- `summary.md` (human-readable PR summary)
- Screenshots / traces / logs (sanitized: zero cookies, passwords, or PII)

## Cleanup
Stop only processes/containers owned by this run (never `killall`). Confirm `manifest.json` and `summary.md` survive teardown.

## Helpers & Troubleshooting
- List every helper script with exact invocation flags and timeouts.
- Document common local blockers (ports, Docker context, browser install, dirty worktree).

## Success & Failure Criteria
- `0` (`pass`): clean revision, all checks pass, cleanup succeeded, evidence retained.
- `1` (`fail`): failed check, invariant violation, or dirty worktree.
- `2` (`blocked`): missing environment prerequisite.
