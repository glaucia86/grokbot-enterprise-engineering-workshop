# ADR-0001 — Modular Monolith with Executable Dependency Boundaries

**Status:** Accepted  
**Date:** 2026-11-26

Procurement Hub stays a single Next.js + TypeScript + PostgreSQL Modular Monolith whose four internal layers (`domain`, `application`, `infrastructure`, `app` UI/routes) are enforced by ESLint `no-restricted-imports` rules and negative architecture tests (`bun run verify:architecture`), rather than splitting into microservices or relying on code-review prose.

## Considered Options

- **Microservices (Procurement + Budget + Audit services with async broker):** Rejected. Introduces distributed consensus, saga orchestration, Kubernetes/Kafka infrastructure noise, and 10x participant setup friction that obscures the core transactional invariant within a 60-minute workshop.
- **Unstructured Next.js full-stack app (route handlers calling Drizzle directly):** Rejected. Makes it trivial for AI coding agents to leak database queries into UI components or bypass domain invariants, repeating the exact antipatterns Lauren Tan's Trust Pyramid warns against.
- **Modular Monolith with executable ESLint boundary guards (Chosen):** Gives agents an unmistakable directory layout, keeps business invariants pure and fast to test in `domain/`, isolates ACID transactions in `infrastructure/`, and rejects boundary violations deterministically in milliseconds.

## Consequences

- Every new file under `src/modules/procurement/domain/` must stay zero-dependency TypeScript.
- `tests/unit/architecture.test.ts` and `scripts/verify-architecture.ts` act as living architectural fitness functions that prove ESLint rejects violations across all four layers.
