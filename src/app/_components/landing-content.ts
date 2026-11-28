export const invariants = [
  { id: "INV-01", title: "Financial consistency" },
  { id: "INV-02", title: "Non-negative availability" },
  { id: "INV-03", title: "Idempotency" },
  { id: "INV-04", title: "Payload consistency" },
  { id: "INV-05", title: "Tenant isolation" },
  { id: "INV-06", title: "Authorization" },
  { id: "INV-07", title: "State machine integrity" },
  { id: "INV-08", title: "Audit consistency" },
  { id: "INV-09", title: "Atomicity" },
  { id: "INV-10", title: "Recoverability" },
] as const;

export const trustLayers = [
  { layer: "05", name: "Prose, rules & skills", command: "skills/verify-procurement" },
  { layer: "04", name: "Formal verification", command: "bun run verify:formal" },
  { layer: "03", name: "Runtime verification", command: "bun run verify:all" },
  { layer: "02", name: "Deterministic checks", command: "bun run check:static" },
  { layer: "01", name: "Codebase & architecture", command: "bun run verify:architecture" },
] as const;

export const stack = ["Next.js 16", "React 19", "PostgreSQL 18", "Bun 1.4.5", "Drizzle", "Vitest", "Playwright", "TLA+"] as const;
