import { expect, test } from "@playwright/test";

test("an attendee opens the lab and checks its readiness", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Clarity before\s+money moves\./ })).toBeVisible();

  const [response] = await Promise.all([
    page.waitForResponse((event) => new URL(event.url()).pathname === "/api/health"),
    page.getByRole("link", { name: "Check lab readiness" }).click(),
  ]);
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ready" });
});
