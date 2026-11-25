# Implementation tickets

The ticket IDs match the [vertical slices](05-vertical-slices.md). The [PRD](01-product-requirements.md) defines the FR and AC IDs, the [technical specification](02-technical-architecture.md) defines the interfaces and the [verification strategy](04-verification-strategy.md) defines the V checks. Each row is a proposed ticket for repository review.

| Ticket | Blocked by | End-to-end outcome and exit evidence | Trace |
| --- | --- | --- | --- |
| VS-00 — Run the lab | Specification and skill bootstrap | From a fresh checkout, install locked dependencies, start disposable PostgreSQL and the app, and see the smoke route in HTTP and a browser. Record terminal, Codex, GrokBot, Docker and artifact retrieval capability outcomes. | FR-10, AC-09 (local prerequisite), V-01 subset |
| VS-01 — Submit and find requests | VS-00 | Switch among seeded lab identities, submit as a requester, list and see own rows and observe creation in the tenant audit trail. Confirm wrong roles, foreign tenants and invalid input fail through HTTP and leave state unchanged. | FR-01/02/03/05/06, AC-04/05/08, V-02/03 |
| VS-02 — Decide and audit | VS-01 | From the browser, complete request → decision → audit. Confirm rollback, competing decisions, denied self-decision and ordinary replay using persisted state. | FR-04/05/07/08, AC-02/03/05/06/07/08, V-02/03/05 |
| VS-03 — Establish the starter behavior | VS-02 | Show the expected failing business invariant in the isolated lab while ordinary starter workflows still pass. Review PH-42 and retain evidence from the actual run. | FR-07, AC-01/05 (known failing), V-03/04 |
| VS-04 — Drive and retain evidence | VS-03 | Run launch, doctor, drive and cleanup as an operator. Verify the feature map against the app and retain candidate-linked evidence after teardown, including the known failing invariant on the starter. | FR-10, AC-01/05/09, V-04/05 |
| VS-05 — Restore submission integrity | VS-04 | Run the same relevant checks on the reference candidate. Verify replay, conflicts, state counts, tenant scope, migration behavior and the browser flow. | FR-07/08/09, AC-01–09 (local checks and CI input), V-01–05 |
| VS-06 — Reproduce independently and package | VS-05 | Review independent CI evidence for the exact candidate and verify the separate participant and solution checkouts against their release gates. | FR-10, AC-09, V-06 |
| VS-07 — Check a bounded model (optional) | VS-05 | Run the prepared model with published bounds and show a reproducible counterexample and checked reference invariant. Keep the result separate from application evidence. | AC-01 (model-level), V-07/08 |
