export const invariants = [
  { id: "INV-01", title: "Financial consistency", body: "Committed budget never exceeds allocated budget and always equals the sum of financial commitments." },
  { id: "INV-02", title: "Non-negative availability", body: "Available budget stays at or above zero for every cost center, at all times." },
  { id: "INV-03", title: "Idempotency", body: "Equivalent retries never create extra commitments, budget deductions, or business transitions." },
  { id: "INV-04", title: "Payload consistency", body: "Reusing a key with a different payload or actor returns 409 with zero state mutation." },
  { id: "INV-05", title: "Tenant isolation", body: "A tenant can never read, approve, commit against, or audit another tenant's records." },
  { id: "INV-06", title: "Authorization", body: "Only a same-tenant approver within their limit, who did not create the request, may approve it." },
  { id: "INV-07", title: "State machine integrity", body: "PENDING moves to APPROVED or REJECTED exactly once; terminal states never move again." },
  { id: "INV-08", title: "Audit consistency", body: "Exactly one audit event per creation and per decision, never duplicated by retries or lost." },
  { id: "INV-09", title: "Atomicity", body: "Status, budget, commitment, idempotency, and audit writes commit or roll back as one unit." },
  { id: "INV-10", title: "Recoverability", body: "Failures leave zero partial state; a lost response is recovered by retrying the same key." },
] as const;

export const trustLayers = [
  { layer: "05", name: "Prose, rules & skills", body: "AGENTS.md and project skills guide judgment, backed by human pull request review.", command: "skills/verify-procurement" },
  { layer: "04", name: "Formal verification", body: "TLC model-checks the approval protocol for counterexamples across bounded interleavings.", command: "bun run verify:formal" },
  { layer: "03", name: "Runtime verification", body: "Real Next.js, PostgreSQL 18, and Chromium exercise every journey end to end.", command: "bun run verify:all" },
  { layer: "02", name: "Deterministic checks", body: "Static analysis, database constraints, and property-based suites reject drift.", command: "bun run check:static" },
  { layer: "01", name: "Codebase & architecture", body: "Pure domain types, explicit ports, and ACID transactions carry the invariants.", command: "bun run verify:architecture" },
] as const;

export const workflowSteps = [
  { step: "01", name: "Reproduce", body: "Turn the incident into a deterministic, observable failure against real PostgreSQL.", command: "bun run ph42:reproduce" },
  { step: "02", name: "Model", body: "Shape domain types and invariants before logic, then drive the change red to green.", command: "bun run test:unit" },
  { step: "03", name: "Verify", body: "Exercise the running system and persist revision-bound evidence that survives cleanup.", command: "bun run verify:all" },
  { step: "04", name: "Prove", body: "Model-check the protocol and hand off a pull request for human review.", command: "bun run verify:formal" },
] as const;

export const stack = ["Next.js 16", "React 19", "PostgreSQL 18", "Bun 1.4.5", "Drizzle ORM", "Zod", "Vitest", "fast-check", "Playwright", "TLA+ / TLC"] as const;
