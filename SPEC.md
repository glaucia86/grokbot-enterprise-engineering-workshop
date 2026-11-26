# SPEC — Procurement Hub Technical Architecture & Contracts

**Document ID:** `PH-SPEC-002`  
**Version:** `2.0`  
**Status:** Accepted  
**Date:** `2026-11-26`  
**Related:** [PRD](PRD.md) · [Glossary](docs/domain/GLOSSARY.md) · [ADRs](docs/adr/) · [RTM](docs/architecture/REQUIREMENTS-TRACEABILITY.md)

---

## 1. Architectural Style: Enforceable Modular Monolith

Procurement Hub runs as a single **Next.js 16 App Router + TypeScript 5.9 (strict)** modular monolith backed by **PostgreSQL 18.7** via **Drizzle ORM** and **Zod 4** at external boundaries, executed on the repository's pinned **Bun 1.4.5** runtime with **Vitest** and **Playwright**.

```text
Browser / HTTP Client
        │
        ▼
┌──────────────────────────────────────────────────────────┐
│ src/app/  (Next.js UI & Route Handlers — Composition)    │
│   • Zod input validation & canonical normalization       │
│   • Same-origin & server-side session resolution         │
│   • Stable HTTP status & error-code mapping              │
└─────────────────────────┬────────────────────────────────┘
                          │ calls use cases
                          ▼
┌──────────────────────────────────────────────────────────┐
│ src/modules/procurement/application/  (Use Cases & Ports)│
│   • Depends ONLY on ./ and ../domain/                    │
│   • Enforces role/policy preconditions & orchestration   │
│   • Defines repository & transaction ports               │
└─────────────────────────┬────────────────────────────────┘
                          │ depends on
                          ▼
┌──────────────────────────────────────────────────────────┐
│ src/modules/procurement/domain/  (Pure Core)             │
│   • ZERO external imports (enforced by ESLint)           │
│   • MoneyMinor, BudgetPosition, ApprovalPolicy,          │
│     PurchaseStatus state machine, fingerprint rules      │
└──────────────────────────────────────────────────────────┘
                          ▲ implemented by
┌─────────────────────────┴────────────────────────────────┐
│ src/modules/procurement/infrastructure/  (PG Adapters)   │
│   • Drizzle + postgres.js ACID transactions              │
│   • Row-level FOR UPDATE locking on cost_centers         │
│   • Cannot import UI (src/app/**) or next/headers        │
└─────────────────────────┬────────────────────────────────┘
                          ▼
┌──────────────────────────────────────────────────────────┐
│ PostgreSQL 18.7  (Defense-in-Depth Constraints)          │
│   • Composite tenant FKs on every child table            │
│   • CHECK (committed_budget_minor <= allocated_budget)   │
│   • UNIQUE (tenant_id, request_id) commitments           │
│   • UNIQUE (tenant_id, idempotency_key) decisions        │
└──────────────────────────────────────────────────────────┘
```

### Executable Dependency Direction (`eslint.config.ts`)

| Layer | Allowed Imports | Forbidden Imports (ESLint `error`) |
| --- | --- | --- |
| `src/modules/procurement/domain/**/*.ts` | Relative `./*` domain files only | Any npm package, `next/*`, `drizzle-orm`, `postgres`, `application`, `infrastructure`, `server`, `app` |
| `src/modules/procurement/application/**/*.ts` | `./*` and `../domain/*` only | `next/*`, `react`, `drizzle-orm`, `postgres`, `../infrastructure/*`, `../../../server/*`, `app` |
| `src/modules/procurement/infrastructure/**/*.ts` | `drizzle-orm`, `postgres`, `../application/*`, `../domain/*`, `../../../server/db/*`, `../../../server/sha256` | `next/*`, `react`, `../../../app/*`, `../../../server/auth/*`, `../../../server/http/*` |
| `src/app/**/*.tsx` | React, Next.js UI primitives, `../server/auth/*`, `../server/procurement/*`, sibling UI files | `drizzle-orm`, `postgres`, `../modules/procurement/infrastructure/*`, `../server/db/*` |

---

## 2. Domain Model & Value Types (`src/modules/procurement/domain/`)

- **`MoneyMinor`**: integer USD minor units (`1 .. Number.MAX_SAFE_INTEGER` for purchase amounts; `0 .. Number.MAX_SAFE_INTEGER` for budget counters). All budget arithmetic (`computeAvailableBudget`, `canCommitAmount`, `addCommittedAmount`) validates `Number.isSafeInteger` and never uses binary floating-point division/multiplication for financial invariants (see [ADR-0002](docs/adr/ADR-0002-exact-monetary-minor-units.md)).
- **`TenantActor`**: `{ tenantId: string; userId: string; role: TenantRole; approvalLimitMinor: number | null }`, always resolved from the server-side `lab_sessions` + `memberships` tables.
- **`CostCenter`**: `{ id, tenantId, code, name, currency: "USD", allocatedBudgetMinor, committedBudgetMinor, availableBudgetMinor, updatedAt }`.
- **`PurchaseRequest`**: `{ id, costCenterId, costCenterCode, costCenterName, title, justification, amountMinor, currency: "USD", status: "PENDING" | "APPROVED" | "REJECTED", createdAt, updatedAt }`.
- **`FinancialCommitment`**: `{ id, costCenterId, requestId, amountMinor, currency: "USD", committedByActorName, committedAt }`.
- **`ApprovalPolicy` (`evaluateApprovalAuthority`)**:
  1. `actor.role === "APPROVER"` -> else `FORBIDDEN`
  2. `actor.userId !== requesterId` -> else `FORBIDDEN` (self-approval prohibited)
  3. For `"APPROVE"` decisions: `actor.approvalLimitMinor !== null && amountMinor <= actor.approvalLimitMinor` -> else `APPROVAL_LIMIT_EXCEEDED`
- **`DecisionFingerprint`**: deterministic canonical string `JSON.stringify(["decision-v1", requestId, decision, normalizedReason ?? null])` hashed via SHA-256 (`requestHash`), paired with direct canonical comparison on stored normalized fields.

---

## 3. PostgreSQL Schema & Constraints (`src/server/db/schema.ts` + `drizzle/`)

Existing migrations `0000_tenant_scoped_procurement.sql` and `0001_ensure_tenant_idempotency.sql` are preserved. Two tracked migrations extend the schema:

### `0002_cost_centers_and_commitments.sql` (Starter & Solution baseline schema)
1. Adds `approval_limit_minor bigint` to `memberships` (`CHECK (approval_limit_minor IS NULL OR approval_limit_minor BETWEEN 1 AND 9007199254740991)`).
2. Creates `cost_centers`:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id uuid NOT NULL REFERENCES tenants(id)`
   - `code text NOT NULL`
   - `name text NOT NULL`
   - `currency text NOT NULL DEFAULT 'USD'` (`CHECK (currency = 'USD')`)
   - `allocated_budget_minor bigint NOT NULL` (`CHECK (allocated_budget_minor BETWEEN 0 AND 9007199254740991)`)
   - `committed_budget_minor bigint NOT NULL DEFAULT 0`
   - `updated_at timestamptz NOT NULL DEFAULT now()`
   - `UNIQUE (tenant_id, id)` (composite FK target), `UNIQUE (tenant_id, code)`
3. Adds `cost_center_id uuid NOT NULL` to `purchase_requests` with composite FK `(tenant_id, cost_center_id) REFERENCES cost_centers(tenant_id, id)`.
4. Creates `financial_commitments`:
   - `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
   - `tenant_id uuid NOT NULL`
   - `cost_center_id uuid NOT NULL`
   - `request_id uuid NOT NULL`
   - `amount_minor bigint NOT NULL` (`CHECK (amount_minor BETWEEN 1 AND 9007199254740991)`)
   - `currency text NOT NULL DEFAULT 'USD'`
   - `committed_by_actor_id uuid NOT NULL`
   - `committed_at timestamptz NOT NULL DEFAULT now()`
   - Composite FKs to `cost_centers(tenant_id, id)`, `purchase_requests(tenant_id, id)`, `memberships(tenant_id, user_id)`.
   - *(Note: In starter schema `0002`, `committed_budget_minor <= allocated_budget_minor`, `UNIQUE (tenant_id, request_id)`, and `decision_idempotency_keys` are intentionally absent so the starter defect genuinely breaks in PostgreSQL.)*

### `0003_approval_integrity_constraints.sql` (Reference Solution upgrade migration)
Runs inside an `ACCESS EXCLUSIVE` locked migration block with safe preflight reconciliation checks (never deletes or alters historical data):
1. Preflight check: refuses migration with SQLSTATE `23514` if any `cost_centers` row already has `committed_budget_minor < 0` or `committed_budget_minor > allocated_budget_minor`.
2. Preflight check: refuses migration with SQLSTATE `23505` if `financial_commitments` already contains duplicate `(tenant_id, request_id)` rows.
3. Adds `CONSTRAINT cost_centers_budget_bounds_check CHECK (committed_budget_minor >= 0 AND committed_budget_minor <= allocated_budget_minor)`.
4. Adds `CONSTRAINT financial_commitments_tenant_request_unique UNIQUE (tenant_id, request_id)`.
5. Creates `decision_idempotency_keys`:
   - `tenant_id uuid NOT NULL`
   - `idempotency_key text NOT NULL`
   - `actor_id uuid NOT NULL`
   - `request_id uuid NOT NULL`
   - `decision text NOT NULL` (`CHECK (decision IN ('APPROVE', 'REJECT'))`)
   - `reason text`
   - `request_hash text NOT NULL`
   - `response_status integer NOT NULL`
   - `created_at timestamptz NOT NULL DEFAULT now()`
   - `PRIMARY KEY (tenant_id, idempotency_key)`
   - Composite FKs to `memberships(tenant_id, user_id)` and `purchase_requests(tenant_id, id)`.

---

## 4. Transactional Approval Algorithm (Reference Solution — ADR-0003 & ADR-0004)

Inside one PostgreSQL `READ COMMITTED` transaction:

1. **Validate inputs & resolve server-side actor/tenant** at route boundary (`Idempotency-Key` header required on `POST /api/purchase-requests/:id/decision`, validated `^[A-Za-z0-9_-]{1,128}$`).
2. **Pre-check actor role** (`actor.role === "APPROVER"` -> else `403 FORBIDDEN`) **before** inspecting idempotency records (**INV-06**).
3. **Check existing `decision_idempotency_keys`** by `(tenant_id, idempotency_key)`:
   - If found:
     - If `existing.actorId !== actor.userId` or `existing.requestId !== requestId` or `existing.decision !== input.decision` or `(existing.reason ?? null) !== (input.reason ?? null)` -> return `409 IDEMPOTENCY_CONFLICT` (zero disclosure, zero mutation).
     - Re-load target `purchase_request` in tenant and re-verify `evaluateApprovalAuthority(actor, existingRequest.requesterId, existingRequest.amountMinor, input.decision)` -> if revoked/unauthorized, return `403 FORBIDDEN` or `403 APPROVAL_LIMIT_EXCEEDED` (**INV-06 on replay**).
     - Return `200` with current request + commitment + cost center snapshot (`replayed: true`).
4. **Load target `purchase_request` in tenant** (`WHERE tenant_id = $1 AND id = $2`):
   - If absent -> return `404 NOT_FOUND` (**INV-05**).
   - Verify `evaluateApprovalAuthority(actor, record.requesterId, record.amountMinor, input.decision)` -> return `403 FORBIDDEN` or `403 APPROVAL_LIMIT_EXCEEDED` (**INV-06**).
5. **Acquire deterministic lock ordering** (prevents deadlocks):
   - Lock `cost_centers` row (`SELECT ... FROM cost_centers WHERE tenant_id = $1 AND id = $2 FOR UPDATE`) when `decision === "APPROVE"`.
   - Lock `purchase_requests` row (`SELECT ... FROM purchase_requests WHERE tenant_id = $1 AND id = $2 FOR UPDATE`).
6. **Reserve idempotency key atomically** (`INSERT INTO decision_idempotency_keys (...) ON CONFLICT (tenant_id, idempotency_key) DO NOTHING RETURNING idempotency_key`):
   - If conflict (racing concurrent identical-key request committed first): re-read `decision_idempotency_keys` in a fresh statement under `READ COMMITTED`, validate actor + payload + authority, and return `200` replay or `409 IDEMPOTENCY_CONFLICT`.
7. **Enforce state machine** (`record.status === "PENDING"`):
   - If not `PENDING` -> throw internal rollback sentinel and return `409 INVALID_TRANSITION` (so no orphan idempotency key or commitment persists!).
8. **Enforce financial budget invariant** (for `APPROVE`):
   - Check `costCenter.allocatedBudgetMinor - costCenter.committedBudgetMinor >= record.amountMinor`.
   - If insufficient -> roll back transaction cleanly and return `409 INSUFFICIENT_BUDGET` (leaving request `PENDING`, budget untouched, and idempotency key unconsumed so user can adjust/retry later).
   - Execute `UPDATE cost_centers SET committed_budget_minor = committed_budget_minor + $amount, updated_at = now() WHERE tenant_id = $1 AND id = $2 RETURNING ...` (also guarded by DB `CHECK`).
   - Execute `INSERT INTO financial_commitments (...)`.
9. **Transition request & write audit event atomically**:
   - `UPDATE purchase_requests SET status = $status, updated_at = now() WHERE tenant_id = $1 AND id = $2 AND status = 'PENDING' RETURNING ...`
   - `INSERT INTO audit_events (tenant_id, request_id, actor_id, event_type, reason) VALUES (...)`
10. **Commit transaction** and return HTTP `200` with `{ request, commitment, costCenter, replayed: false }`.

> **Starter Defect Contrast:** On `workshop/starter`, `decide()` omits `FOR UPDATE`, omits the DB budget `CHECK`, omits `decision_idempotency_keys`, reads `cost_centers.committed_budget_minor` into memory, checks availability in TypeScript, optionally waits on a strictly `WORKSHOP_LAB_MODE`-gated synchronization barrier (`X-Workshop-Sync-Barrier`) when invoked by the lab reproduction harness, and then issues `UPDATE cost_centers SET committed_budget_minor = committed_budget_minor + amount`. Two concurrent `$7,000` approvals both observe `committed = 0 <= 10,000` and commit `$14,000`.

---

## 5. HTTP API Contracts

All protected routes require an active server-side session cookie (`procurement_lab_session`, `HttpOnly`, `SameSite=Strict`) and same-origin verification on mutations.

| Method & Path | Request | Success | Error Codes |
| --- | --- | --- | --- |
| `GET /api/health` | None | `200 { status: "ready" }` | `503 { status: "unavailable" }` |
| `POST /api/lab/session` | `{ identity }` (lab mode only) | `200 { identity }` + `Set-Cookie` | `400`, `403`, `404` (when lab mode off) |
| `GET /api/cost-centers` | Active session | `200 { costCenters: CostCenter[] }` (tenant-scoped) | `401` |
| `GET /api/purchase-requests` | Active session, optional `?status=` | `200 { requests: PurchaseRequest[] }` (role & tenant-scoped) | `400`, `401` |
| `POST /api/purchase-requests` | `Idempotency-Key` header; `{ costCenterId, title, justification, amountMinor, currency: "USD" }` | `201` created / `200` replay (`PurchaseRequest`) | `400 INVALID_INPUT`, `401`, `403 FORBIDDEN`, `404 NOT_FOUND` (foreign/missing cost center), `409 IDEMPOTENCY_CONFLICT` |
| `GET /api/purchase-requests/:id` | Active session | `200` (`PurchaseRequest` + `costCenter` + `commitment?`) | `401`, `404 NOT_FOUND` |
| `POST /api/purchase-requests/:id/decision` | `Idempotency-Key` header; `{ decision: "APPROVE" | "REJECT", reason? }` | `200` (`PurchaseRequest` + `costCenter` + `commitment?` + `replayed`) | `400 INVALID_INPUT`, `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `403 APPROVAL_LIMIT_EXCEEDED`, `404 NOT_FOUND`, `409 IDEMPOTENCY_CONFLICT`, `409 INVALID_TRANSITION`, `409 INSUFFICIENT_BUDGET`, `500 INTERNAL_ERROR` |
| `GET /api/purchase-requests/:id/audit` | Active session (`APPROVER`/`AUDITOR`) | `200 { events: AuditEvent[] }` | `401`, `403 FORBIDDEN`, `404 NOT_FOUND` |

---

## 6. Security & Isolation Controls

- Tenant ID, user ID, role, and `approvalLimitMinor` are **never** accepted from request bodies, headers, or query strings (`z.strictObject` rejects unexpected fields with `400 INVALID_INPUT`).
- Lab-only synchronization barrier (`X-Workshop-Sync-Barrier`) is strictly ignored unless `WORKSHOP_LAB_MODE === "enabled"` and only exists in the defective starter branch; it is completely absent from the reference solution.
- Loopback guard (`src/server/db/lab-config.ts`) enforces `127.0.0.1` / `localhost` and database name `procurement_hub_lab`.
- No secrets, session cookies, or raw connection strings are ever logged or emitted to `artifacts/verification/`.
