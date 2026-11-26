# Optional PH-42 model check

This exercise belongs to VS-07. It checks a finite model of identical, authenticated submission attempts. The HTTP and PostgreSQL harness supplies implementation evidence.

## Test the TypeScript contracts

```bash
bun install --frozen-lockfile
bun run test:properties
```

The suite generates 200 examples per property. It checks that presentation-only changes across retries preserve the normalized purchase and request key. It also exercises sequences of same-tenant actors against the domain decision policy. The model for these sequences applies the first permitted decision and checks that later decisions are ineligible.

The default seed is `4207`. Set `PH42_PROPERTY_SEED` to another signed 32-bit integer to replay a run. On a failure, fast-check reports the seed, shrunk input and replay path.

## Run TLC

Use Java 11 or newer and the official [TLA+ v1.7.4 release](https://github.com/tlaplus/tlaplus/releases/tag/v1.7.4). Download its [tla2tools.jar](https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar) outside the repository. The Bun driver checks the JAR against the pinned SHA-256 and invokes both configurations with one worker and seed `4207`.

```bash
bun run verify:formal /path/to/tla2tools.jar ph42-demo
```

The command writes the model, configuration copies, logs and manifest under `artifacts/formal/ph42-demo/`. Use a new run ID for another trace.

## Read the two results

| Configuration | Expected outcome |
| --- | --- |
| [Stale check](stale-check.cfg) | TLC exits 12 and reports `UniqueRequest`. Two clients observe a miss for the same tenant and key before either commits. Both then create one request and creation event. |
| [Atomic commit](atomic.cfg) | TLC exits 0 and exhausts the configured states. The second commit for the same tenant and key returns the existing request. A different tenant/key pair has its own scope. |

Both configurations use the same [transition model](PH42.tla) and two clients, two tenants and two keys. Each client performs at most one observation and one commit. The model starts with empty request and audit sets. Insert and creation audit are one transition, so `CreationAuditMatches` requires the sets to agree. `SameScopedReplay` requires every response to identify a committed request in the same tenant/key scope. Terminal states are intentional.

The model assumes equal normalized payload and actor within a scope. Request validation, conflicts between different payloads or actors, rollbacks, approvals and database isolation belong to the TypeScript and runtime suites. The finite TLC result applies to the modeled transitions and published bounds.
