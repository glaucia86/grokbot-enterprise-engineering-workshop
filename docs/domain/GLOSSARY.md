# Procurement Hub

A multi-tenant corporate procurement platform where employees submit purchase requests against departmental budgets and authorized managers commit funds under strict financial and audit invariants.

## Language

**Tenant**:
An isolated corporate organization with its own **Memberships**, **Cost Centers**, **Purchase Requests**, **Financial Commitments**, and **Audit Events**.
_Avoid_: Workspace, account, company, org

**User**:
A synthetic person represented in the platform who may hold **Memberships** across one or more **Tenants**.
_Avoid_: Account, employee, profile

**Membership**:
The binding of a **User** to a **Tenant** with a single **Role** and an optional **Approval Limit**.
_Avoid_: Permission grant, user role

**Role**:
A **Membership**'s authority class within a **Tenant**: `REQUESTER`, `APPROVER`, or `AUDITOR`.
_Avoid_: Group, tier, level

**Approval Limit**:
The maximum monetary amount an `APPROVER` **Membership** is authorized to approve on a single **Purchase Request**.
_Avoid_: Spending cap, threshold, quota

**Cost Center**:
A **Tenant**-scoped departmental budget ledger holding an **Allocated Budget** and a **Committed Budget** in USD minor units.
_Avoid_: Budget bucket, department, wallet, account

**Allocated Budget**:
The total authorized funds assigned to a **Cost Center** for the active period.
_Avoid_: Budget limit, total funds, cap

**Committed Budget**:
The running sum of all **Financial Commitments** recorded against a **Cost Center** from approved **Purchase Requests**.
_Avoid_: Spent amount, used budget, reserved funds

**Available Budget**:
The remaining unencumbered funds of a **Cost Center**, defined as **Allocated Budget** minus **Committed Budget**, which must never be negative.
_Avoid_: Remaining balance, free budget, headroom

**Purchase Request**:
A **Requester**'s formal proposal to spend a positive USD minor-unit amount against a same-tenant **Cost Center**, starting in `PENDING` and transitioning at most once to `APPROVED` or `REJECTED`.
_Avoid_: Order, requisition, ticket, PO

**Financial Commitment**:
The durable, one-to-one financial ledger entry created atomically when a **Purchase Request** transitions to `APPROVED`, binding the request's amount to its **Cost Center**.
_Avoid_: Charge, transaction, encumbrance, payout

**Approval Decision**:
An eligible **Approver**'s terminal action (`APPROVE` or `REJECT`) on a `PENDING` **Purchase Request** submitted by another **User** in the same **Tenant**.
_Avoid_: Review, sign-off, verdict

**Idempotency Key**:
A **Tenant**-scoped client-supplied identifier representing one logical submission or **Approval Decision** intent so retries converge without duplicating writes.
_Avoid_: Request ID, correlation ID, nonce

**Audit Event**:
An immutable **Tenant**-scoped business record (`CREATED`, `APPROVED`, or `REJECTED`) written atomically alongside the corresponding **Purchase Request** state transition.
_Avoid_: Log line, history entry, activity item
