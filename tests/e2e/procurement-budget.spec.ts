import { expect, test, type Page } from "@playwright/test";

const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";

async function switchIdentity(page: Page, key: string, expectedFragment: string) {
  // Review and dashboard share the identity control; wait for the destination shell.
  await expect(page.getByRole("region", { name: "Inbox", exact: true })).toBeVisible();
  await page.getByLabel("Lab identity").selectOption(key);
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.locator(".session-state")).toContainText(expectedFragment);
}

async function openFullReview(page: Page, title: string) {
  await page.getByRole("region", { name: "Inbox", exact: true }).getByRole("link", { name: title }).click();
  const selected = page.getByRole("region", { name: "Selected request", exact: true });
  await expect(selected.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await selected.getByRole("link", { name: "Open full review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

test("cost center budget commits on approval and blocks over-limit junior approval in browser", async ({ page }, testInfo) => {
  const title = "Enterprise Audit Platform " + crypto.randomUUID().slice(0, 8);
  await page.goto("/");
  await page.getByRole("button", { name: "Northstar Requester Northstar Industries", exact: true }).click();
  await expect(page.locator(".session-state")).toContainText("Northstar Requester · REQUESTER");

  // The approved workspace presents cost center budgets as a list.
  const costCenterBudget = page.locator('[data-cost-center-code="CC-ENG-01"]');
  await expect(costCenterBudget).toBeVisible();
  await expect(costCenterBudget).toContainText("$10,000.00");

  const form = page.getByRole("region", { name: "New purchase request", exact: true });
  await form.getByLabel("Cost center", { exact: true }).selectOption(CC_ENG_01_ID);
  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Justification").fill("Q4 enterprise security compliance verification");
  await form.getByLabel("Amount (USD cents)").fill("600000");
  await expect(page.getByText("= $6,000.00 USD")).toBeVisible();
  await form.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("$6,000.00", { exact: true })).toBeVisible();

  // Junior approver (limit $5,000) receives actionable limit error when trying to approve $6,000
  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await switchIdentity(page, "northstar-junior-approver", "Northstar Team Lead · APPROVER");
  await openFullReview(page, title);
  await expect(page.getByText("exceeds your approval limit")).toBeVisible();
  const decision = page.getByRole("region", { name: "Record decision" });
  await decision.getByLabel("Decision").selectOption({ label: "Approve" });
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(decision.getByRole("alert")).toContainText("exceeds your organizational approval limit");

  // Senior approver approves $6,000 -> Financial commitment panel appears and budget updates
  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await switchIdentity(page, "northstar-approver", "Northstar Approver · APPROVER");
  await openFullReview(page, title);
  await decision.getByLabel("Decision").selectOption({ label: "Approve" });
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("article").getByRole("status")).toHaveText("APPROVED");
  await expect(page.getByRole("heading", { name: "Financial commitment" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Financial commitment" })).toContainText("$6,000.00");

  await page.screenshot({ path: testInfo.outputPath("approved-commitment-detail.png"), fullPage: true });

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await expect(costCenterBudget).toContainText("CC-ENG-01");
  await page.getByRole("navigation", { name: "Filter requests by status" }).getByRole("link", { name: /Approved/ }).click();
  await expect(page).toHaveURL(/\/dashboard\?status=APPROVED$/);
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("cost-center-budgets-dashboard.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({ path: testInfo.outputPath("mobile-dashboard.png"), fullPage: true });
});
