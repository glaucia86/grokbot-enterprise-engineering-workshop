import { expect, test, type Page } from "@playwright/test";

async function openFullReview(page: Page, title: string) {
  await page.getByRole("region", { name: "Inbox", exact: true }).getByRole("link", { name: title }).click();
  const selected = page.getByRole("region", { name: "Selected request", exact: true });
  await expect(selected.getByRole("heading", { name: title, exact: true })).toBeVisible();
  await selected.getByRole("link", { name: "Open full review", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: title, exact: true })).toBeVisible();
}

test("a requester submits a purchase and an auditor sees its creation event", async ({ page }) => {
  const title = "Warehouse gloves " + crypto.randomUUID();
  await page.goto("/");
  await page.getByRole("button", { name: "Northstar Requester Northstar Industries", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My requests" })).toBeVisible();
  const form = page.getByRole("region", { name: "New purchase request", exact: true });
  await form.getByLabel("Title").fill(title);
  await form.getByLabel("Justification").fill("Warehouse replenishment");
  await form.getByLabel("Amount (USD cents)").fill("1250");
  await form.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("$12.50", { exact: true })).toBeVisible();
  const detail = page.url();

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByLabel("Lab identity").selectOption("northstar-auditor");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByRole("heading", { name: "Tenant requests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit request" })).toHaveCount(0);
  await openFullReview(page, title);
  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();
  await expect(page.getByText("CREATED", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await expect(page.getByRole("region", { name: "Inbox", exact: true })).toBeVisible();
  await page.getByLabel("Lab identity").selectOption("meridian-requester");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByText("Meridian Retail · Meridian Requester · REQUESTER")).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  const foreign = await page.goto(detail);
  expect(foreign?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});
