import { expect, test, type Page } from "@playwright/test";

const identities = {
  requester: { key: "northstar-requester", label: "Northstar Requester · REQUESTER" },
  approver: { key: "northstar-approver", label: "Northstar Approver · APPROVER" },
  auditor: { key: "northstar-auditor", label: "Northstar Auditor · AUDITOR" },
};

async function switchIdentity(page: Page, role: keyof typeof identities) {
  const identity = identities[role];
  // Review and dashboard share the identity control; wait for the destination shell.
  await expect(page.getByRole("region", { name: "Inbox", exact: true })).toBeVisible();
  await page.getByLabel("Lab identity").selectOption(identity.key);
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.locator(".session-state")).toContainText("Northstar Industries · " + identity.label);
}

async function openFullReview(page: Page, title: string) {
  await page.getByRole("region", { name: "Inbox", exact: true }).getByRole("link", { name: title }).click();
  const selected = page.getByRole("region", { name: "Selected request", exact: true });
  await expect(selected.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await selected.getByRole("link", { name: "Open full review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

for (const scenario of [
  { action: "Approve", status: "APPROVED" },
  { action: "Reject", status: "REJECTED", reason: "The shelf dimensions need to be confirmed." },
] as const) {
  test(`an approver can ${scenario.action.toLowerCase()} a request and an auditor can verify the decision`, async ({ page }) => {
    const title = "Warehouse shelving " + crypto.randomUUID();
    await page.goto("/");
    await page.getByRole("button", { name: "Northstar Requester Northstar Industries", exact: true }).click();
    await expect(page.locator(".session-state")).toContainText("Northstar Industries · " + identities.requester.label);
    const form = page.getByRole("region", { name: "New purchase request", exact: true });
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Justification").fill("Replace damaged warehouse shelving");
    await form.getByLabel("Amount (USD cents)").fill("19500");
    await form.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByRole("heading", { name: title })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record decision" })).toHaveCount(0);

    await page.getByRole("link", { name: "Back to purchase requests" }).click();
    await switchIdentity(page, "approver");
    await openFullReview(page, title);
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
    await openFullReview(page, title);
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
    await openFullReview(page, title);
    await expect(status).toHaveText(scenario.status);
    await expect(page.getByRole("heading", { name: "Audit trail" })).toHaveCount(0);
  });
}
