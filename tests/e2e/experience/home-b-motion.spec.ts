import { expect, test, type Page } from "@playwright/test";

// The approved B home is public and runs in the regular verification suite.

const chapters = [
  { id: "story-submit", title: "A request, with context.", control: "Submit request", status: "Pending decision" },
  { id: "story-review", title: "Know the impact first.", control: "Review impact", status: "Awaiting confirmation" },
  { id: "story-record", title: "One decision. One commitment.", control: "Record approval", status: "Approved (illustrative)" },
  { id: "story-trace", title: "Follow every decision.", control: "Trace the outcome", status: "Approved (illustrative)" },
] as const;

const disclosure = "Illustrative scenario. No live data or financial actions.";

function watchIllustration(page: Page) {
  const errors: string[] = [];
  const writes: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method())) {
      writes.push(`${request.method()} ${path}`);
    }
  });
  return { errors, writes };
}

function scene(page: Page) {
  return page.locator("#workflow").getByRole("figure", { name: "Illustrative mobile purchase review" });
}

function controls(page: Page) {
  return page.getByRole("group", { name: "Illustrative decision steps" });
}

async function openHome(page: Page, path = "/home") {
  await page.goto(path);
  await expect(page.locator("#workflow").getByRole("heading", { name: "From a request to a record." })).toBeVisible();
  await expect(page.getByText(disclosure, { exact: true })).toBeVisible();
  await expect(scene(page)).toBeVisible();
}

async function scrollToChapter(page: Page, id: string) {
  await page.locator(`#${id}`).evaluate((chapter) => {
    chapter.scrollIntoView({ behavior: "instant", block: "center" });
  });
}

async function crossChapterBoundary(page: Page, id: string, offset: number) {
  await page.locator(`#${id}`).evaluate(async (chapter, offset) => {
    const top = chapter.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top - window.innerHeight / 2 + offset, behavior: "instant" });
    // Allow browser layout and intersection delivery between each small scroll step.
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  }, offset);
}

async function scrollWithWheel(page: Page, distance: number) {
  const start = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, distance);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeCloseTo(start + distance, 0);
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function phonePosition(page: Page) {
  return scene(page).locator(".ph-journey-phone").evaluate((phone) => {
    const bounds = phone.getBoundingClientRect();
    return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, transform: getComputedStyle(phone).transform };
  });
}

async function expectChapter(page: Page, index: number) {
  const chapter = chapters[index];
  await expect(controls(page).getByRole("button", { name: chapter.control, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(controls(page).locator('[aria-pressed="true"]')).toHaveCount(1);
  // All four screens share one scrolling document; only the active screen represents this chapter.
  const panel = scene(page).locator(`[data-story-screen="${index}"]`);
  await expect(panel).toHaveAttribute("data-active", "true");
  await expect(panel).toBeInViewport({ ratio: 0.05 });
  await expect(panel.getByText(chapter.status, { exact: true })).toBeVisible();
  await expect(panel.getByText("$7,000.00", { exact: true }).first()).toBeVisible();
  if (index < 2) {
    await expect(panel.getByText("$10,000.00", { exact: true }).first()).toBeVisible();
    await expect(panel.getByText("$0.00", { exact: true })).toBeVisible();
  } else {
    await expect(panel.getByText("$3,000.00", { exact: true }).first()).toBeVisible();
    await expect(panel.getByText("$0.00", { exact: true })).toHaveCount(0);
  }
}

async function expectReadableChapters(page: Page) {
  for (const chapter of chapters) {
    const article = page.locator(`#${chapter.id}`);
    await expect(article).toHaveJSProperty("tagName", "ARTICLE");
    const heading = article.getByRole("heading", { name: chapter.title, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeInViewport();
    await expect(heading).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  }
}

function expectNoSideEffects(observed: ReturnType<typeof watchIllustration>) {
  expect(observed.writes, "The illustrative story must not submit financial or session changes").toEqual([]);
  expect(observed.errors, "The home must render and respond without browser errors").toEqual([]);
}

test("scrolling forward and backward changes the illustrative review without writing data", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observed = watchIllustration(page);
  await openHome(page);

  for (const index of [0, 1, 2, 3, 2, 1, 0]) {
    await scrollToChapter(page, chapters[index].id);
    await expectChapter(page, index);
    await expect(scene(page)).toBeInViewport();
  }
  expectNoSideEffects(observed);
});

test("wheel scrolling advances the screen continuously inside a stationary phone", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observed = watchIllustration(page);
  await openHome(page);
  await page.evaluate(() => document.fonts.ready);
  await scrollToChapter(page, "story-review");
  const review = controls(page).getByRole("button", { name: "Review impact", exact: true });
  await expect(review).toHaveAttribute("aria-pressed", "true");

  const initialPhone = await phonePosition(page);
  await page.mouse.move(initialPhone.x + initialPhone.width / 2, initialPhone.y + initialPhone.height / 2);
  await scrollWithWheel(page, 48);
  const settledPhone = await phonePosition(page);
  expect(settledPhone.transform, "The device frame must not rotate or translate with the page scroll").toBe(initialPhone.transform);
  for (const axis of ["x", "y", "width", "height"] as const) {
    expect(Math.abs(settledPhone[axis] - initialPhone[axis]), `The phone's ${axis} must remain stable`).toBeLessThanOrEqual(0.5);
  }

  const viewport = scene(page).locator(".ph-mobile-viewport");
  const track = viewport.locator(".ph-mobile-track");
  await expect(viewport).toBeInViewport();
  await expect(track.locator("[data-story-screen]")).toHaveCount(chapters.length);
  const initialViewport = await viewport.boundingBox();
  const initialTrackTop = await track.evaluate((element) => element.getBoundingClientRect().top);
  await scrollWithWheel(page, 48);
  const firstTrackTop = await track.evaluate((element) => element.getBoundingClientRect().top);
  expect(await phonePosition(page)).toEqual(settledPhone);
  await expect(review).toHaveAttribute("aria-pressed", "true");
  await scrollWithWheel(page, 48);
  const secondTrackTop = await track.evaluate((element) => element.getBoundingClientRect().top);
  expect(await phonePosition(page)).toEqual(settledPhone);
  expect(await viewport.boundingBox(), "The clipping window stays fixed while its document moves").toEqual(initialViewport);
  await expect(review).toHaveAttribute("aria-pressed", "true");

  const firstMovement = initialTrackTop - firstTrackTop;
  const secondMovement = firstTrackTop - secondTrackTop;
  expect(firstMovement, "Content must move before the chapter changes").toBeGreaterThan(3);
  expect(secondMovement, "Another small scroll must continue moving the same internal document").toBeGreaterThan(3);
  expect(Math.abs(firstMovement - secondMovement)).toBeLessThanOrEqual(Math.max(1, firstMovement * 0.2));
  await scrollWithWheel(page, -96);
  expect(await track.evaluate((element) => element.getBoundingClientRect().top)).toBeCloseTo(initialTrackTop, 0);
  expect(await phonePosition(page)).toEqual(settledPhone);

  const clipping = await viewport.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const content = element.querySelector(".ph-mobile-track");
    const center = bounds.left + bounds.width / 2;
    return {
      overflow: getComputedStyle(element).overflowY,
      escapesAbove: content?.contains(document.elementFromPoint(center, bounds.top - 2)),
      escapesBelow: content?.contains(document.elementFromPoint(center, bounds.bottom + 2)),
    };
  });
  expect(["hidden", "clip"]).toContain(clipping.overflow);
  expect(clipping.escapesAbove).toBe(false);
  expect(clipping.escapesBelow).toBe(false);
  expectNoSideEffects(observed);
});

test("keyboard controls select chapters and the walkthrough can be skipped", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observed = watchIllustration(page);
  await openHome(page);
  const review = controls(page).getByRole("button", { name: "Review impact", exact: true });
  await review.focus();
  await expect(review).toBeFocused();
  await page.keyboard.press("Enter");
  await expectChapter(page, 1);
  await expect(page.locator("#story-review")).toBeInViewport();

  await page.keyboard.press("Tab");
  const record = controls(page).getByRole("button", { name: "Record approval", exact: true });
  await expect(record).toBeFocused();
  await page.keyboard.press("Space");
  await expectChapter(page, 2);

  const skip = page.getByRole("link", { name: "Skip walkthrough", exact: true });
  await skip.focus();
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#controls$/);
  await expect(page.locator("#controls").getByRole("heading")).toBeInViewport();
  expectNoSideEffects(observed);
});

test("chapter selection follows slow boundary crossings in both directions", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observed = watchIllustration(page);
  await openHome(page);
  await page.evaluate(() => document.fonts.ready);
  await scrollToChapter(page, chapters[0].id);
  await expectChapter(page, 0);

  for (const index of [1, 2, 3]) {
    await crossChapterBoundary(page, chapters[index].id, -24);
    await expectChapter(page, index - 1);
    for (const offset of [-8, 8, 24]) await crossChapterBoundary(page, chapters[index].id, offset);
    await expectChapter(page, index);
    await expect(page.locator(`#${chapters[index].id}`).getByRole("heading")).toBeInViewport();
  }
  for (const index of [3, 2, 1]) {
    await crossChapterBoundary(page, chapters[index].id, 24);
    await expectChapter(page, index);
    for (const offset of [8, -8, -24]) await crossChapterBoundary(page, chapters[index].id, offset);
    await expectChapter(page, index - 1);
  }
  expectNoSideEffects(observed);
});

test("a direct chapter link and live motion preference changes preserve a readable journey", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const observed = watchIllustration(page);
  await openHome(page, "/home#story-trace");
  await expect(page.locator("#story-trace").getByRole("heading")).toBeInViewport();
  await expectChapter(page, 3);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectReadableChapters(page);
  const submit = controls(page).getByRole("button", { name: "Submit request", exact: true });
  await submit.scrollIntoViewIfNeeded();
  const beforeSelection = await page.evaluate(() => window.scrollY);
  await submit.click();
  await expectChapter(page, 0);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeSelection, 0);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);

  await page.emulateMedia({ reducedMotion: "no-preference" });
  await scrollToChapter(page, "story-review");
  await expectChapter(page, 1);
  await expect(scene(page)).toBeInViewport();
  const skip = page.getByRole("link", { name: "Skip walkthrough", exact: true });
  await skip.click();
  await expect(page.locator("#controls").getByRole("heading")).toBeInViewport();
  expectNoSideEffects(observed);
});

test("reduced motion keeps the whole story readable and controls update without scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const observed = watchIllustration(page);
  await openHome(page);
  await expectReadableChapters(page);
  const record = controls(page).getByRole("button", { name: "Record approval", exact: true });
  await record.scrollIntoViewIfNeeded();
  const beforeSelection = await page.evaluate(() => window.scrollY);
  await record.click();
  await expectChapter(page, 2);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeSelection, 0);
  expect(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running").length)).toBe(0);
  expectNoSideEffects(observed);
});

test("browsers without scroll timelines retain readable chapters and manual review", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    Object.defineProperty(CSS, "supports", {
      configurable: true,
      value: (property: string, value?: string) => {
        if (property.includes("animation-timeline")) return false;
        return value === undefined ? supports(property) : supports(property, value);
      },
    });
  });
  const observed = watchIllustration(page);
  await openHome(page);
  await expectReadableChapters(page);
  const trace = controls(page).getByRole("button", { name: "Trace the outcome", exact: true });
  await trace.scrollIntoViewIfNeeded();
  const beforeSelection = await page.evaluate(() => window.scrollY);
  await trace.click();
  await expectChapter(page, 3);
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeSelection, 0);
  expectNoSideEffects(observed);
});

for (const viewport of [
  { width: 320, height: 720 },
  { width: 390, height: 844 },
  { width: 1280, height: 600 },
]) {
  test(`the story is readable without overflow at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    const observed = watchIllustration(page);
    await openHome(page);
    await expectReadableChapters(page);
    const trace = controls(page).getByRole("button", { name: "Trace the outcome", exact: true });
    await trace.scrollIntoViewIfNeeded();
    const beforeSelection = await page.evaluate(() => window.scrollY);
    await trace.click();
    await expectChapter(page, 3);
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(beforeSelection, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
    expectNoSideEffects(observed);
  });
}

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1280, height: 720 } });

  test("the scenario and every chapter remain available", async ({ page }) => {
    const observed = watchIllustration(page);
    await openHome(page);
    await expectReadableChapters(page);
    await expect(scene(page).getByText("$7,000.00", { exact: true }).first()).toBeVisible();
    const skip = page.getByRole("link", { name: "Skip walkthrough", exact: true });
    await skip.click();
    await expect(page).toHaveURL(/#controls$/);
    await expect(page.locator("#controls").getByRole("heading")).toBeInViewport();
    expectNoSideEffects(observed);
  });
});
