# Procurement Hub workshop reference

This checkout includes the [PH-42 issue](doc-specs/03-demo-issue-42.md) and the [instructor reference ADR](doc-specs/adr/0001-idempotency-reference-solution.md). It is intended for instructor review.

Install Bun 1.4.5 and Docker Compose v2.

```bash
bun install --frozen-lockfile
bun run browser:install
bun run verify:all --slice VS-05 --run-id reference-rehearsal
```

The VS-05 run exercises live submission, approval, audit, and migration cases using PostgreSQL and Chromium. It records the revision and results in `artifacts/verification/VS-05/reference-rehearsal/`. The historical fixture reports its expected failure. The live API should return the same request ID to both concurrent calls and persist one creation event.

For manual startup, standalone PostgreSQL and individual journeys, follow the [verification guide](skills/verify-procurement/SKILL.md).

## Run the lab

Copy `.env.example` to `.env`. Run `bun run lab:up`, then `bun run lab:doctor --db-only`. Start `bun run dev` in a second terminal and run `bun run lab:doctor` to confirm readiness. Stop the app with Ctrl+C and run `bun run lab:down`.

Inspired by Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack). This is an independent workshop adaptation.
