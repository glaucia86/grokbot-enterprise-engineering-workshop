# Procurement Hub — Guided Workshop Edition (`workshop/guided`)

This guided edition starts from the exact same live reproducible PH-42 defect as `workshop/starter`, and adds **[GUIDED-WORKSHEET.md](GUIDED-WORKSHEET.md)** with progressive diagnostic hints, architectural checkpoints, and verification milestones — without immediately revealing the full solution.

## Quick Start

```bash
cp .env.example .env            # Windows PowerShell: Copy-Item .env.example .env
bun install --frozen-lockfile
bun run browser:install
bun run lab:bootstrap
bun run dev                     # Terminal 2: http://127.0.0.1:3000
```

Open **[GUIDED-WORKSHEET.md](GUIDED-WORKSHEET.md)** and **[docs/workshop/PARTICIPANT-GUIDE.md](docs/workshop/PARTICIPANT-GUIDE.md)** to work through Milestones 1–5 step by step.
