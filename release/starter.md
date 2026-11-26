# Procurement Hub workshop starter

Procurement Hub is a synthetic lab for the Packt workshop **GrokBot for Enterprise Engineering Workflows**. Use the [PH-42 issue](doc-specs/03-demo-issue-42.md) to investigate a historical duplicate and verify the application.

Install Bun 1.4.5 and Docker Compose v2. The workshop uses a local PostgreSQL database and Chromium.

```bash
bun install --frozen-lockfile
bun run browser:install
bun run verify:all --run-id participant-rehearsal
```

The harness builds the app, starts the lab, runs the checks and retains evidence in `artifacts/verification/VS-04/participant-rehearsal/`. Use a new ID for each run. For a standalone PostgreSQL installation or manual setup, follow the [verification guide](skills/verify-procurement/SKILL.md).

## Run the lab

To explore the interface manually, copy `.env.example` to `.env`. Run `bun run lab:up` and `bun run dev`, then open `http://127.0.0.1:3000`. The [feature map](skills/verify-procurement/features/README.md) describes the requester, approver and auditor journeys. Stop the app with Ctrl+C and run `bun run lab:down`.

The PH-42 snapshot intentionally reports duplicate requests and events. The live lab separately measures the behavior of its running HTTP API and database.

Inspired by Lauren Tan's [pstack](https://github.com/cursor/plugins/tree/main/pstack). This is an independent workshop adaptation.
