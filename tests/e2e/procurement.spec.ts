import { expect, test } from "@playwright/test";

test("a requester submits a purchase and an auditor sees its creation event", async ({ page }) => {
  const title = "Warehouse gloves " + crypto.randomUUID();
  await page.goto("/");
  await page.getByLabel("Lab identity").selectOption("northstar-requester");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByRole("heading", { name: "My requests" })).toBeVisible();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Justification").fill("Warehouse replenishment");
  await page.getByLabel("Amount (USD cents)").fill("1250");
  await page.getByRole("button", { name: "Submit request" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("$12.50")).toBeVisible();
  const detail = page.url();

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await expect(page.getByRole("link", { name: title })).toBeVisible();
  await page.getByLabel("Lab identity").selectOption("northstar-auditor");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByRole("heading", { name: "Tenant requests" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Submit request" })).toHaveCount(0);
  await page.getByRole("link", { name: title }).click();
  await expect(page.getByRole("heading", { name: "Audit trail" })).toBeVisible();
  await expect(page.getByText("CREATED", { exact: true })).toBeVisible();

  await page.getByRole("link", { name: "Back to purchase requests" }).click();
  await page.getByLabel("Lab identity").selectOption("meridian-requester");
  await page.getByRole("button", { name: "Switch identity" }).click();
  await expect(page.getByText("Meridian Retail · Meridian Requester · REQUESTER")).toBeVisible();
  await expect(page.getByRole("link", { name: title })).toHaveCount(0);
  const foreign = await page.goto(detail);
  expect(foreign?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: title })).toHaveCount(0);
});
