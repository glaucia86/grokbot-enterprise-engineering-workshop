# Workshop slides

Seventeen Reveal.js slides follow **PH-42** (*Concurrent Procurement Approval Violates Financial and Tenant Isolation Invariants*) from a live `$14,000 > $10,000` PostgreSQL budget overrun to an ACID, formally model-checked, independently verified Pull Request.

## View the deck

- **Local preview.** With Bun 1.4.5 and the checkout available, run `bun run slides:preview` and open `http://127.0.0.1:4173/workshop/`.
- **Presenter edition (EN + PT-BR notes).** Run `bun run slides:preview:presenter`, open `http://127.0.0.1:4173/presenter/`, and press **S** for Reveal's bilingual speaker notes window.
- **Verify audience + presenter builds & responsive layout:**

```bash
bun install --frozen-lockfile
bun run browser:install
bun run slides:verify
```
