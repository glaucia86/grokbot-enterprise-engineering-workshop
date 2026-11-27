# ADR-0004 — Tenant-Scoped Approval Idempotency Keys, Fingerprinting & Auth-Before-Replay

**Status:** Accepted  
**Audience:** Instructor / Reference Solution (keep out of `workshop/starter` participant branch)  
**Date:** 2026-11-26

Every `POST /api/purchase-requests/:id/decision` operation requires a client-supplied `Idempotency-Key` (`[A-Za-z0-9_-]{1,128}`) stored in `decision_idempotency_keys` with composite primary key `(tenant_id, idempotency_key)`, canonical SHA-256 payload fingerprinting, and mandatory server-side authorization re-validation **before** any replayed result is returned.

## Considered Options

- **No approval idempotency key (rely solely on `PENDING -> APPROVED` transition rejection):** Rejected. If an approver's HTTP response is lost after commit (timeout), retrying returns `409 INVALID_TRANSITION` instead of safely recovering the `200 APPROVED` outcome (`INV-03`, `INV-10`), forcing callers to guess whether their approval succeeded or another manager rejected the request.
- **Return cached JSON response immediately upon key match (skipping auth checks):** Rejected. Creates a privilege-revocation bypass: if an approver is downgraded to `AUDITOR` or has their `approvalLimitMinor` lowered after a timeout, replaying the key would still return `200` and leak decision details, violating `INV-06`.
- **Store only the SHA-256 hash without canonical columns:** Rejected. Makes future hash-version migrations brittle (as seen in legacy submission fingerprints). Storing both `request_hash` AND normalized columns (`actor_id`, `request_id`, `decision`, `reason`) lets equivalence checks remain authoritative across hash upgrades.
- **Tenant-scoped `decision_idempotency_keys` with auth-before-replay and failed-attempt non-persistence (Chosen):**
  - **Scope:** `(tenant_id, idempotency_key)` — identical keys in different tenants never collide (`INV-05`).
  - **Fingerprint:** `sha256(JSON.stringify(["decision-v1", requestId, decision, normalizedReason ?? null]))` plus exact column equality on `(actor_id, request_id, decision, reason)`.
  - **Conflict policy:** Different payload or different actor in same tenant returns generic `409 IDEMPOTENCY_CONFLICT` with zero details of the original request (`INV-04`).
  - **Non-success rollback:** Rejected attempts (`403`, `404`, `409 INSUFFICIENT_BUDGET`, `409 INVALID_TRANSITION`, `500`) roll back completely and never poison the idempotency key (`INV-10`).
  - **Retention:** Retained indefinitely within the disposable lab lifecycle; production TTL/archival policy is explicitly documented as out of scope.

## Consequences

- Concurrent duplicate retries with the same `Idempotency-Key` synchronize via `INSERT ... ON CONFLICT (tenant_id, idempotency_key) DO NOTHING` + re-read under `READ COMMITTED` after the winning transaction commits, returning `200` with `replayed: true` and zero duplicate financial commitment or audit event.
- Authorization changes (role revocation, reduced `approvalLimitMinor`, membership removal) take effect immediately even on replay paths.
