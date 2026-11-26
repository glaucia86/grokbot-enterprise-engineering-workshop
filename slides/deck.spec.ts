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
    "assets/architecture.svg", "assets/bloub-default-cycle.gif", "assets/bloub-cycle-still.webp",
    "assets/bloub-license.txt", "assets/concurrency.svg", "assets/credits.txt",
    "assets/glaucia-lemos.jpg", "assets/procurement-hub.webp", "assets/verification-loop.svg",
    "deck.css", "deck.js", "index.html", "reset.css", "reveal-license.txt", "reveal.css",
  ].sort());
  const html = await (await request.get("/workshop/")).text();
  expect(html).not.toMatch(/data-presenter|class="notes"|lang="pt-BR"|speaker:|slide:|ADR-0001|presenter-guide/);
  expect((await request.get("/workshop/presenter-guide.md")).status()).toBe(404);
  expect((await request.get("/workshop/grokbot-profiles.md")).status()).toBe(404);
});

const cast = ["Engineering Lead", "Harness Engineer", "TypeScript FDE", "QA Engineer", "DevOps Engineer"];

test("only the active cast follows the mouse and resets to its resting pose", async ({ page }) => {
  await page.goto("/workshop/#/start");
  const eyes = page.locator("#start .cast .avatar-gaze");
  await expect(eyes).toHaveCount(5);
  const offsets = () => eyes.evaluateAll((groups) => groups.map((group) => {
    const transform = getComputedStyle(group).transform;
    const { m41, m42 } = new DOMMatrixReadOnly(transform === "none" ? undefined : transform);
    return { x: m41, y: m42 };
  }));
  const neutral = cast.map(() => ({ x: 0, y: 0 }));
  const maskIds = await page.locator(".avatar mask").evaluateAll((masks) => masks.map((mask) => mask.id));
  expect(new Set(maskIds).size).toBe(maskIds.length);
  await expect.poll(offsets).toEqual(neutral);
  await page.mouse.move(3, 3);
  await expect.poll(async () => (await offsets()).every(({ x, y }) => x < -2 && y < -1)).toBe(true);
  for (const { x, y } of await offsets()) expect(Math.hypot(x, y)).toBeLessThanOrEqual(8.01);
  await expect(page.locator("#questions .avatar-gaze").first()).toHaveCSS("transform", "none");
  await page.mouse.move(1260, 700);
  await expect.poll(async () => (await offsets()).every(({ x, y }) => x > 2 && y > 1)).toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.locator(".reveal")).toHaveClass(/\boverview\b/);
  await expect.poll(offsets).toEqual(neutral);
  await page.keyboard.press("Escape");
  await page.mouse.move(3, 3);
  await expect.poll(offsets).not.toEqual(neutral);
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect.poll(offsets).toEqual(neutral);
  await page.mouse.move(1260, 700);
  await expect.poll(offsets).not.toEqual(neutral);
  await page.keyboard.press("ArrowRight");
  await expect.poll(offsets).toEqual(neutral);
  await page.keyboard.press("ArrowLeft");
  await page.mouse.move(3, 3);
  await expect.poll(offsets).not.toEqual(neutral);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.mouse.move(1260, 700);
  await expect.poll(offsets).toEqual(neutral);
});

test("the illustrative GIF loads on request and stops on toggle or navigation", async ({ page }) => {
  const gifs: string[] = [];
  page.on("request", (request) => {
    if (request.url().endsWith(".gif")) gifs.push(request.url());
  });
  await page.goto("/workshop/#/agent-loop");
  const image = page.locator("#agent-loop .expression img");
  const play = page.getByRole("button", { name: "Play avatar animation" });
  const stop = page.getByRole("button", { name: "Stop avatar animation" });
  await expect(image).toHaveAttribute("src", /\.webp$/);
  expect(gifs).toEqual([]);
  await play.press("Space");
  await expect(image).toHaveAttribute("src", /\.gif$/);
  await expect.poll(() => gifs.length).toBe(1);
  await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  await expect(page.locator("#agent-loop .fragment.visible")).toHaveCount(0);
  await stop.press("Space");
  await expect(image).toHaveAttribute("src", /\.webp$/);
  await play.click();
  const next = page.getByRole("button", { name: "next slide" });
  await next.click();
  await expect(image).toHaveAttribute("src", /\.gif$/);
  await next.click();
  await expect(page.locator("#verify-live.present")).toBeVisible();
  await expect(image).toHaveAttribute("src", /\.webp$/);
  await page.getByRole("button", { name: "previous slide" }).click();
  await expect(play).toBeVisible();
  await play.click();
  await page.emulateMedia({ media: "print" });
  await expect(image).toHaveAttribute("src", /\.webp$/);
  await expect(play).toBeHidden();
  await page.emulateMedia({ media: "screen" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(play).toBeHidden();
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
  for (const [id, role] of [
    ["procurement-hub", cast[0]], ["boot-lab", cast[1]], ["runtime", cast[2]],
    ["verify-live", cast[3]], ["run-harness", cast[4]],
  ]) {
    await expect(page.locator(`#${id} .face figcaption`)).toHaveText(role);
  }
  await expect(page.locator("#review .presenter")).toContainText("Human Reviewer");
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
      await expect(page.locator("#questions .cast figcaption")).toHaveText(cast);
      const back = page.getByRole("link", { name: "Back to the first slide" });
      if (name === "phone") await back.tap();
      else await back.click();
      await expect(page.locator("#start.present .cast figcaption")).toHaveText(cast);
      if (name === "phone") {
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.mouse.move(10, 10);
        await expect(page.locator("#start .avatar-gaze").first()).toHaveCSS("transform", "none");
        await page.goto("/workshop/#/agent-loop");
        await expect(page.getByRole("button", { name: "Play avatar animation" })).toBeVisible();
      }
      expect(failures).toEqual([]);
    });
  });
}
