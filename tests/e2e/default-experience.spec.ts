import { expect, test, type Page } from "@playwright/test";

async function expectWorkspaceEndsWithContent(page: Page) {
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  const bottom = await page.locator(".ph-workspace").evaluate((workspace) => {
    const content = workspace.querySelector(".ph-workspace-main");
    if (!content) throw new Error("The B workspace content must be present");
    return {
      unusedSpace: workspace.getBoundingClientRect().bottom - content.getBoundingClientRect().bottom,
      documentTail: document.documentElement.scrollHeight - (workspace.getBoundingClientRect().bottom + window.scrollY),
    };
  });
  expect(Math.abs(bottom.unusedSpace), "The workspace must not reserve empty space for the removed comparison dock").toBeLessThanOrEqual(1);
  expect(Math.abs(bottom.documentTail), "The document must end with the workspace").toBeLessThanOrEqual(1);
}

test("the approved B home is the default without a variant query or prototype controls", async ({ page }) => {
  for (const path of ["/", "/home", "/?variant=A", "/?variant=C", "/home?variant=A", "/home?variant=C"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: /Clarity before\s+money moves\./ })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Prototype comparison" })).toHaveCount(0);
    await expect(page.getByRole("group", { name: "Choose a design variant" })).toHaveCount(0);
    await expect(page.locator('a[href*="variant="]')).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Open workspace", exact: true })).toBeVisible();
  }
});

test("the B workspace and full review end without an empty comparison-dock gap", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/home");
  await page.getByRole("button", { name: "Northstar Requester Northstar Industries", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "My requests", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Prototype comparison" })).toHaveCount(0);
  await expect(page.locator('a[href*="variant="]')).toHaveCount(0);
  await expectWorkspaceEndsWithContent(page);

  const title = "Workspace layout check " + crypto.randomUUID();
  const form = page.getByRole("region", { name: "New purchase request", exact: true });
  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Justification").fill("Verify the complete purchase workflow in the approved workspace");
  await form.getByLabel("Amount (USD cents)").fill("2500");
  await form.getByRole("button", { name: "Submit request", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/requests\/[a-f\d-]+$/);
  await expect(page.getByRole("link", { name: "Back to purchase requests", exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Prototype comparison" })).toHaveCount(0);
  await expect(page.locator('a[href*="variant="]')).toHaveCount(0);
  await expectWorkspaceEndsWithContent(page);

  const detail = page.url();
  for (const destination of ["/dashboard", detail]) {
    for (const variant of ["A", "C"]) {
      await page.goto(`${destination}?variant=${variant}`);
      await expect(page.locator(".ph-workspace")).toBeVisible();
      await expect(page.getByRole("complementary", { name: "Prototype comparison" })).toHaveCount(0);
      await expect(page.locator('a[href*="variant="]')).toHaveCount(0);
    }
  }
});
