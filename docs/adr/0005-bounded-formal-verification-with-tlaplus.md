# ADR-0005 — Bounded TLA+ / TLC Formal Verification with Zero-Host-Java Docker Fallback

**Status:** Accepted  
**Date:** 2026-11-26

Critical concurrent financial approval transitions and idempotent retry interleavings are model-checked with official TLA+ / TLC (`formal/ProcurementApproval.tla`), driven by a TypeScript script (`engineering/verify-formal.ts`) that uses local `java` when available and transparently falls back to a pinned Docker JRE container (`eclipse-temurin:21-jre-alpine`) with a SHA-256-verified `tla2tools.jar` (v1.7.4).

## Considered Options

- **Property-based testing (`fast-check`) alone, labeled as formal verification:** Rejected. Property-based testing samples randomized executions; it is **not** exhaustive state-space model checking and must never be misrepresented as formal verification.
- **Require participants to install JDK 21 on Windows/macOS/Linux:** Rejected. Procurement Hub is a 100% TypeScript workshop; forcing participants to install a Java toolchain solely for a 5-minute model-checking segment causes high setup friction and breaks reproducibility.
- **Skip executable TLC and show static slides of TLA+:** Rejected. Violates the workshop's core principle (*Prove It Works*): a formal check nobody can run and watch fail is prose, not verification.
- **Official TLA+ / TLC with automatic Docker JRE fallback (Chosen):** Participants already run Docker for PostgreSQL. Running pinned `eclipse-temurin:21-jre-alpine` mounting `formal/` + SHA-256-verified `tla2tools.jar` keeps the repository 100% TypeScript while executing real exhaustive model checking locally and in GitHub Actions.

## Consequences

- `bun run verify:formal` verifies **both** that `defective-read-commit.cfg` fails with exit code `12` and a counterexample violating `BudgetNotExceeded`, AND that `locked-atomic.cfg` exits `0` with `0` queued states remaining.
- **Honest scope boundary:** A passing TLC run proves safety properties hold for the modeled transitions within the configured finite bounds (`Allocated = 10`, two requests of `Amount = 7`, two approver workers, retry operations). It does **not** formally prove the TypeScript runtime, Drizzle ORM SQL generation, or PostgreSQL internals — those are verified separately by Layer 2 & Layer 3 integration, concurrency, and E2E suites.
