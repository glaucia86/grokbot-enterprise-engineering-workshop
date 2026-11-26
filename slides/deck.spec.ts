import { expect, test } from "@playwright/test";

test("a project subpath loads the deck and the walkthrough assets", async ({ page }) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(response.url());
  });

  await page.goto("/workshop/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("From Issue to Verified Pull Request");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/procurement-hub$/);
  const screenshot = page.getByRole("img", { name: /Northstar audit trail/ });
  await expect(screenshot).toBeVisible();
  await expect.poll(() => screenshot.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);

  await page.getByRole("button", { name: "next slide" }).click();
  await expect(page).toHaveURL(/#\/boundaries$/);
  await page.getByRole("button", { name: "previous slide" }).click();
  await expect(page).toHaveURL(/#\/procurement-hub$/);
  expect(failures).toEqual([]);
});

test("a deep link opens a check and its bilingual speaker notes", async ({ page }) => {
  await page.goto("/workshop/#/verify-live");
  await expect(page.locator("section.present")).toContainText("bun run verify:concurrency");
  await expect(page.locator("section.present .notes")).toBeHidden();

  const popup = page.waitForEvent("popup");
  await page.keyboard.press("s");
  const notes = await popup;
  await expect(notes.locator(".speaker-controls-notes")).toContainText("Compare every column");
  await expect(notes.locator(".speaker-controls-notes")).toContainText("Compare as colunas");
});

test("the last slide loads the presenter photo and returns to the cover", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 780 });
  await page.goto("/workshop/#/questions");
  const photo = page.getByRole("img", { name: "Glaucia Lemos" });
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Back to the first slide" }).click();
  await expect(page.locator("section.present")).toHaveAttribute("id", "start");
});
