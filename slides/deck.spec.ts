import { expect, test } from "@playwright/test";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { root } from "../engineering/runtime";

const ids = [
  "start", "trust", "trust-pyramid", "procurement-hub", "invariant", "boundaries",
  "boot-lab", "try-the-app", "runtime", "reproduce", "agent-loop", "verify-live",
  "optional-extension", "run-harness", "review", "takeaways", "questions",
];

test("the public output contains the deck and its reviewed static resources", async ({ request }) => {
  const directory = join(root, "artifacts/slides");
  const files = (await readdir(directory, { recursive: true, withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1).replaceAll("\\", "/"))
    .sort();
  expect(files).toEqual([
    "assets/architecture.svg", "assets/bloub-license.txt", "assets/concurrency.svg",
    "assets/credits.txt", "assets/devops.svg", "assets/engineering-lead.svg",
    "assets/fde-typescript.svg", "assets/glaucia-lemos.jpg", "assets/grok.svg",
    "assets/procurement-hub.webp", "assets/qa-bot.svg", "assets/verification-loop.svg",
    "deck.css", "deck.js", "index.html", "reset.css", "reveal-license.txt", "reveal.css",
  ].sort());
  const html = await (await request.get("/workshop/")).text();
  expect(html).not.toMatch(/data-presenter|class="notes"|lang="pt-BR"|speaker:|slide:|ADR-0001|presenter-guide/);
  expect((await request.get("/workshop/presenter-guide.md")).status()).toBe(404);
});

test("keyboard, controls and the pyramid reveal the five layers in order", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/workshop/#/start");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("From Issue to Verified Pull Request");
  await page.keyboard.press("ArrowRight");
  await expect(page).toHaveURL(/#\/trust$/);
  await page.getByRole("button", { name: "next slide" }).click();
  const pyramid = page.locator("#trust-pyramid.present");
  await expect(pyramid).toBeVisible();
  await expect(pyramid.locator(".fragment.visible")).toHaveCount(0);
  const layers = ["Codebase", "Static analysis", "Verification", "Prose", "Human review"];
  for (const layer of layers) {
    await page.keyboard.press("ArrowRight");
    await expect(pyramid.locator(".current-fragment strong")).toHaveText(layer);
  }
  await expect(pyramid.locator(".fragment.visible")).toHaveCount(5);
  await page.keyboard.press("ArrowLeft");
  await expect(pyramid.locator(".fragment.visible")).toHaveCount(4);
  await expect(page.locator(".reveal")).toHaveClass(/\bnone\b/);
});

test("presenter notes match all slides and open in Reveal speaker view", async ({ page }) => {
  await page.goto("/presenter/#/verify-live");
  await expect(page.locator("section.present")).toContainText("bun run verify:concurrency");
  const slides = page.locator(".slides > section");
  await expect(slides).toHaveCount(ids.length);
  for (const [index, id] of ids.entries()) {
    const slide = slides.nth(index);
    await expect(slide).toHaveAttribute("id", id);
    await expect(slide.locator('.notes [lang="en"] p')).not.toBeEmpty();
    await expect(slide.locator('.notes [lang="pt-BR"] p')).toHaveCount(2);
  }
  await expect(page.locator("section.present .notes")).toBeHidden();

  const popup = page.waitForEvent("popup");
  await page.keyboard.press("s");
  const notes = await popup;
  const text = notes.locator(".speaker-controls-notes");
  await expect(text).toContainText("Now we're exercising the running API");
  await expect(text).toContainText("Agora vamos exercitar a API");
  await expect(text).toContainText("34:00–39:00");
});

for (const [name, viewport] of [
  ["stage", { width: 1440, height: 810 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch: name === "phone" });

    test("every direct link fits and loads local resources", async ({ page }, testInfo) => {
      test.setTimeout(60_000);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const failures: string[] = [];
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("response", (response) => {
        if (response.status() >= 400) failures.push(response.url());
      });
      for (const id of ids) {
        const hash = id === "trust-pyramid" ? id + "/4" : id;
        await page.goto("/workshop/#/" + hash);
        const slide = page.locator("#" + id + ".present");
        await expect(slide).toBeVisible();
        await expect(slide).toHaveCSS("opacity", "1");
        const content = slide.locator(".stage");
        for (const image of await content.locator("img").all()) {
          await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.naturalWidth)).toBeGreaterThan(0);
        }
        const rect = await content.boundingBox();
        expect(rect, id).not.toBeNull();
        expect(rect!.x, id).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width, id).toBeLessThanOrEqual(viewport.width + 1);
        expect(rect!.y + rect!.height, id).toBeLessThanOrEqual(viewport.height + 1);
        await page.screenshot({ path: testInfo.outputPath(id + ".png"), animations: "disabled" });
      }
      await expect(page.locator("#questions .cast img")).toHaveCount(5);
      const back = page.getByRole("link", { name: "Back to the first slide" });
      if (name === "phone") await back.tap();
      else await back.click();
      await expect(page.locator("#start.present .cast img")).toHaveCount(5);
      expect(failures).toEqual([]);
    });
  });
}
