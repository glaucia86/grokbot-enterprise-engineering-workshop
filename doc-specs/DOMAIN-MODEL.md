# Procurement Hub domain model

Use this vocabulary in the product, API and verification. The [PRD](01-product-requirements.md) owns acceptance outcomes and the [technical specification](02-technical-architecture.md) owns storage and wire contracts.

| Term | Meaning and relationship |
| --- | --- |
| Tenant | An organization with its own request history, memberships, key space and audit trail. |
| User | A synthetic person. A user can belong to multiple tenants. |
| Membership | One role for a user in a particular tenant. Requester, approver and auditor are the roles in this lab. |
| Active session | The server-validated actor and tenant context for the operation. The membership supplies current authority. |
| Purchase intent | A requester's intention to submit one purchase. Retries of the same normalized submission represent that intent. |
| Idempotency key | The opaque identifier the client retains while retrying a purchase intent. Its binding is inside one tenant and includes the originating requester and normalized submission. |
| Purchase request | The persisted record produced when an intent succeeds. It belongs to exactly one tenant and one requester. |
| Decision | Approval or rejection by an eligible approver other than the requester. Rejection requires a reason. |
| Audit event | A durable record of creation or a decision. It belongs to the same tenant as the purchase request and identifies an actor in that tenant. |

## Request lifecycle

| Starting state | Operation | Conditions | Result |
| --- | --- | --- | --- |
| No request | Submit | Requester role, valid input and free tenant/key | PENDING and one CREATED event |
| Any persisted state | Replay | Same tenant, requester, key and normalized submission | Return current state and original ID |
| Any persisted state | Reuse key for different intent | Different requester or normalized input in the same tenant | Generic conflict, unchanged request and audit history |
| PENDING | Approve | Same-tenant approver who did not create the request | APPROVED and one APPROVED event |
| PENDING | Reject | Same eligibility and nonblank reason | REJECTED and one REJECTED event |
| APPROVED or REJECTED | Decide | Terminal state is immutable in this workflow | Invalid transition, unchanged request and audit history |

## Invariants

- Only tenant members can act on that tenant's resources. A requester can read their own requests. Approvers and auditors can read tenant requests and audit history. An auditor cannot mutate them.
- A current approver might have previously created a request as a requester. Their new authority cannot override the self-decision prohibition.
- A successful logical submission leaves one request and one creation event. The same key in another tenant represents an independent intent.
- A successful decision leaves one corresponding terminal event. Atomic writes preserve the relationship between state and audit events when a write fails.
- Amounts are positive USD minor units. Payload equivalence uses the normalized submission, including title, justification and amount. Role and tenant identifiers supplied by a client cannot change the active session.
