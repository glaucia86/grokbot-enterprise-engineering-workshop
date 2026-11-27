import { expect, test, type Page } from "@playwright/test";

const CC_ENG_01_ID = "30000000-0000-4000-8000-000000000001";

async function switchIdentity(page: Page, key: string, expectedFragment: string) {
  await page.getByLabel("Lab identity").selectOption(key);
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.locator(".session-state")).toContainText(expectedFragment);
}

test("cost center budget commits on approval and blocks over-limit junior approval in browser", async ({ page }, testInfo) => {
  const title = "Enterprise Audit Platform " + crypto.randomUUID().slice(0, 8);
  await page.goto("/");
  await switchIdentity(page, "northstar-requester", "Northstar Requester · REQUESTER");

  // Confirm Cost Center budgets table is visible
  const ccRow = page.locator('tr[data-cost-center-code="CC-ENG-01"]');
  await expect(ccRow).toBeVisible();
  await expect(ccRow).toContainText("$10,000.00");

  await page.getByLabel("Cost center", { exact: true }).selectOption(CC_ENG_01_ID);
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Justification").fill("Q4 enterprise security compliance verification");
  await page.getByLabel("Amount (USD cents)").fill("600000");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("$6,000.00")).toBeVisible();

  // Junior approver (limit $5,000) receives actionable limit error when trying to approve $6,000
  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await switchIdentity(page, "northstar-junior-approver", "Northstar Team Lead · APPROVER");
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByText("exceeds your approval limit")).toBeVisible();
  const decision = page.getByRole("region", { name: "Record decision" });
  await decision.getByLabel("Decision").selectOption({ label: "Approve" });
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(decision.getByRole("alert")).toContainText("exceeds your organizational approval limit");

  // Senior approver approves $6,000 -> Financial commitment panel appears and budget updates
  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await switchIdentity(page, "northstar-approver", "Northstar Approver · APPROVER");
  await page.getByRole("link", { name: title }).click();
  await decision.getByLabel("Decision").selectOption({ label: "Approve" });
  await decision.getByRole("button", { name: "Save decision" }).click();
  await expect(page.getByRole("article").getByRole("status")).toHaveText("APPROVED");
  await expect(page.getByRole("heading", { name: "Financial commitment" })).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("approved-commitment-detail.png"), fullPage: true });

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await expect(page.locator('tr[data-cost-center-code="CC-ENG-01"]')).toContainText("CC-ENG-01");
  await page.screenshot({ path: testInfo.outputPath("cost-center-budgets-dashboard.png"), fullPage: true });
});
