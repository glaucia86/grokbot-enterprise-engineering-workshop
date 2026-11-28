# Workshop slides

This 60-minute workshop follows **PH-42** through 17 slides. Watch two approvals compete for one cost center, follow the PostgreSQL row lock, and decide what evidence justifies merging the fix.

## View the deck

- **Local preview.** With Bun 1.4.5 and the checkout available, run `bun run slides:preview` and open `http://127.0.0.1:4173/workshop/`.
- **Audience votes.** Open `/workshop/#/trust` for the opening question and `/workshop/#/review` for the merge decision. Use the right arrow to reveal the next step.
- **Check the builds and the desktop and mobile layouts locally.**

```bash
bun install --frozen-lockfile
bun run browser:install
bun run slides:verify
```
