# ADR-0002 — Exact Integer Minor Units (`MoneyMinor`) for Financial Calculations

**Status:** Accepted  
**Date:** 2026-11-26

All monetary amounts (`amountMinor`, `allocatedBudgetMinor`, `committedBudgetMinor`, `approvalLimitMinor`) are represented as exact base-10 integer USD cents (`bigint` in PostgreSQL, validated safe integers in TypeScript via `MoneyMinor`) rather than IEEE-754 floating-point numbers or `numeric` strings.

## Considered Options

- **IEEE-754 JavaScript `number` dollars (e.g., `19.99`):** Rejected. Binary floating-point rounding drift (`0.1 + 0.2 !== 0.3`) can corrupt equality comparisons, idempotency fingerprints, and exact budget boundary checks.
- **PostgreSQL `NUMERIC(18, 2)` + arbitrary-precision decimal library (e.g., `decimal.js`):** Viable for multi-currency FX systems, but adds a runtime dependency into the zero-dependency `domain/` core and extra string-serialization complexity without benefit for fixed-USD single-currency budgets.
- **Exact integer minor units (`bigint` bounded to `Number.MAX_SAFE_INTEGER`) (Chosen):** Zero external dependencies, exact integer arithmetic in both TypeScript and PostgreSQL, unambiguous canonical JSON fingerprinting (`700000` has one representation, unlike `"7000.0"` vs `"7000.00"`), and PostgreSQL `CHECK (... BETWEEN 0 AND 9007199254740991)` guarantees lossless JavaScript integer round-trips up to ~$90 trillion.

## Consequences

- Formatting (`formatUsd`) happens strictly at the UI presentation boundary (`src/app/format-purchase.ts`), never in financial invariant checks.
- Multi-currency FX conversion or sub-cent fractional pricing would require revisiting this decision.
