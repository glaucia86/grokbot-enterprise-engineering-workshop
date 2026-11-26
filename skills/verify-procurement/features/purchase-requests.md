# Purchase requests

At `/`, choose **Northstar Requester** under **Lab identity**, then select **Switch identity**. Fill **Title**, **Justification** and **Amount (USD cents)** with a unique title and amount of `1250`. Select **Submit request**. The app opens `/requests/<id>` with the title and `$12.50`. Use **Back to purchase requests** to locate it under **My requests**.

```bash
bun run test:e2e tests/e2e/procurement.spec.ts
bun run test:integration
bun run verify:concurrency
```

The API uses `POST /api/purchase-requests` to create, `GET /api/purchase-requests` to list and `GET /api/purchase-requests/<id>` for detail. The integration suite covers same-key replay and rejects payload or actor conflicts with HTTP 409. The concurrency check sends two equivalent requests on separate connections and expects HTTP 200 and 201 with a shared ID, one persisted request and one creation event.

For the historical observation, run `bun run verify:ph42-fixture` separately. The snapshot contains two creations for the same key and the command returns the expected exit 1.
