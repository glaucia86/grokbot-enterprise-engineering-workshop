import { expect, test, type Page } from "@playwright/test";

const identities = {
  requester: { key: "northstar-requester", label: "Northstar Requester · REQUESTER" },
  approver: { key: "northstar-approver", label: "Northstar Approver · APPROVER" },
  auditor: { key: "northstar-auditor", label: "Northstar Auditor · AUDITOR" },
};

async function switchIdentity(page: Page, role: keyof typeof identities) {
  const identity = identities[role];
  await page.getByLabel("Lab identity").selectOption(identity.key);
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByText("Northstar Industries · " + identity.label, { exact: true })).toBeVisible();
}

for (const scenario of [
  { action: "Approve", status: "APPROVED" },
  { action: "Reject", status: "REJECTED", reason: "The shelf dimensions need to be confirmed." },
] as const) {
  test(`an approver can ${scenario.action.toLowerCase()} a request and an auditor can verify the decision`, async ({ page }) => {
    const title = "Warehouse shelving " + crypto.randomUUID();
    await page.goto("/");
    await switchIdentity(page, "requester");
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Justification").fill("Replace damaged warehouse shelving");
    await page.getByLabel("Amount (USD cents)").fill("19500");
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record decision" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to purchase requests" }).click();
    await switchIdentity(page, "approver");
    await page.getByRole("link", { name: title }).click();
    const decision = page.getByRole("region", { name: "Record decision" });
    const status = page.getByRole("article").getByRole("status");
    await decision.getByLabel("Decision").selectOption({ label: scenario.action });
    if (scenario.action === "Reject") {
      await decision.getByLabel("Rejection reason").fill(scenario.reason);
    }
    await decision.getByRole("button", { name: "Save decision" }).click();
    await expect(status).toHaveText(scenario.status);
    await expect(decision).toHaveCount(0);

    await page.getByRole("link", { name: "Back to purchase requests" }).click();
    await switchIdentity(page, "auditor");
    await page.getByRole("link", { name: title }).click();
    await expect(status).toHaveText(scenario.status);
    await expect(decision).toHaveCount(0);
    const events = page.getByRole("region", { name: "Audit trail" }).getByRole("listitem");
    await expect(events).toHaveCount(2);
    await expect(events.nth(0)).toContainText("CREATED");
    await expect(events.nth(1)).toContainText(scenario.status);
    await expect(events.nth(1)).toContainText("Northstar Approver");
    if (scenario.action === "Reject") {
      await expect(events.nth(1)).toContainText(scenario.reason);
    }

    await page.getByRole("link", { name: "Back to purchase requests" }).click();
    await switchIdentity(page, "requester");
    await page.getByRole("link", { name: title }).click();
    await expect(status).toHaveText(scenario.status);
    await expect(page.getByRole("heading", { name: "Audit trail" })).toHaveCount(0);
  });
}
