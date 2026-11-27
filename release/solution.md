# Procurement Hub — Reference Solution (`workshop/solution`)

This checkout contains the complete, verified enterprise reference implementation for **PH-42 (*Concurrent Procurement Approval Violates Financial and Tenant Isolation Invariants*)**, including migration `0003`, ACID row-level locking, defense-in-depth PostgreSQL constraints, approval idempotency with auth-before-replay, full Vitest/Playwright suites, Dockerized TLA+/TLC formal verification, 6-job CI governance, and the 12-template Reusable Enterprise Starter Kit.

## Verify End to End in One Command

```bash
bun install --frozen-lockfile
bun run browser:install
bun run verify:all --slice solution --run-id solution-rehearsal
bun run verify:formal --run-id solution-formal
```

Inspect `artifacts/verification/solution/solution-rehearsal/summary.md` and `artifacts/formal/solution-formal/summary.md` after cleanup completes.
