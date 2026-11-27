# Procurement Hub — Workshop Starter (`workshop/starter`)

Welcome to the hands-on lab for **GrokBot for Enterprise Engineering Workflows: From Issue to Verified Pull Request**.

This starter checkout contains a runnable brownfield **Procurement Hub** application with an intentional, live reproducible financial concurrency incident: **[PH-42](doc-specs/03-demo-issue-42.md)**.

## Quick Start

Prerequisites: **Bun 1.4.5**, **Docker Compose v2**, and **Git** (no host Java required).

```bash
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
bun install --frozen-lockfile
bun run browser:install
bun run lab:bootstrap
bun run dev                     # Terminal 2: http://127.0.0.1:3000
```

## Reproduce PH-42 Live

With `bun run dev` running in another terminal:

```bash
bun run lab:doctor
bun run verify:architecture     # Proves 4-layer ESLint boundary enforcement
bun run ph42:reproduce          # Expected EXIT 1: $14,000 committed vs $10,000 budget (-$4,000 available!)
```

## Verify Starter Baseline in One Command

```bash
bun run verify:all --slice starter --run-id participant-baseline
```

Normal single-request workflows, static/architecture checks, unit tests, and Chromium browser journeys pass while live concurrent approval reproduction fails (`INV-01` / `INV-02`).

## Next Steps

Follow **[docs/workshop/PARTICIPANT-GUIDE.md](docs/workshop/PARTICIPANT-GUIDE.md)** and **[skills/verify-procurement/SKILL.md](skills/verify-procurement/SKILL.md)** to investigate, fix, and verify PH-42, or explore **[starter-kit/README.md](starter-kit/README.md)** to adapt these patterns to your own enterprise repositories.
