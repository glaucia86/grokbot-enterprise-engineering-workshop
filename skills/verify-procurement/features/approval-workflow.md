# Approval workflow

Create a pending request as **Northstar Requester**. Return to `/`, switch to **Northstar Approver**, then open the request from **Tenant requests**. In **Record decision**, choose **Approve** or **Reject**, supply **Rejection reason** for a rejection and select **Save decision**. Confirm the status becomes **APPROVED** or **REJECTED** and the decision form disappears. Use a fresh request for each scenario.

```bash
bun run test:e2e tests/e2e/decision.spec.ts
bun run test:integration
```

The public decision route is `POST /api/purchase-requests/<id>/decision`. The integration suite checks role denial, scope, rejection validation, an already decided request, racing approvers and rollback when the audit write fails. The browser journey checks that the requester sees the final status and the auditor sees both **CREATED** and the decision, attributed to the approver.
