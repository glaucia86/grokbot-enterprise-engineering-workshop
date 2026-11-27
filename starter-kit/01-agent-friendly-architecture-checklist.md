# 01 — Agent-Friendly Architecture Checklist

Use this checklist to evaluate whether your codebase guides coding agents toward safe designs structurally.

## Directory & Module Boundaries
- [ ] Pure domain types and invariants live in an isolated `domain/` module with **zero** framework, HTTP, or database imports.
- [ ] Application use cases depend only on `domain/` and explicit repository/transaction ports (never concrete DB clients).
- [ ] UI components cannot import database clients, ORM schemas, or persistence adapters directly.
- [ ] Boundary rules are enforced by executable lint/analyzer rules (`eslint`, `dependency-cruiser`, ArchUnit) AND backed by negative tests proving violations fail CI.

## Domain & Data Integrity
- [ ] Monetary values use exact integer minor units or fixed-precision decimal types — never binary floats.
- [ ] Legal state transitions are represented as explicit unions/functions rather than scattered boolean flags.
- [ ] External inputs are parsed at system boundaries with strict schemas (`z.strictObject`) rejecting unknown authority fields (`tenantId`, `role`, `actorId`).
- [ ] Critical invariants (uniqueness, non-negative balances, composite tenant foreign keys) are enforced inside the database, not solely in application memory.

## Codebase Gardening
- [ ] Deprecated workarounds and misleading comments justifying hacks are removed so agents do not imitate them.
- [ ] Error messages from lint rules and tests tell the agent **what to do instead**.
- [ ] One-command reproducible local bootstrap (`lab:bootstrap`), health check (`lab:doctor`), and reset (`lab:reset`) exist with synthetic data only.
