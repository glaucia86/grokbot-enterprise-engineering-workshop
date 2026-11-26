# Procurement Hub feature map

Run the [lab doctor](../SKILL.md#doctor) before using any of these scenarios. Start the individual checks from the repository root using a disposable lab and its synthetic identities.

| Feature | Browser journey | Runtime check |
| --- | --- | --- |
| [Purchase requests](purchase-requests.md) | Create, list and open a request | Input, replay, conflicts and concurrent submission |
| [Approval workflow](approval-workflow.md) | Approve or reject a pending request | Allowed transition, denial, competing decisions and rollback |
| [Tenant isolation and audit](tenant-isolation-and-audit.md) | Read the audit trail and switch tenant | Ownership, tenant scoping and persisted audit counts |
