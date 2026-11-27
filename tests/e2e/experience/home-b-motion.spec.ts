import { expect, test, type Page } from "@playwright/test";

// Start the lab server with WORKSHOP_PROTOTYPES=enabled, then run:
// WORKSHOP_PROTOTYPES=enabled bun --bun playwright test tests/e2e/experience/home-b-motion.spec.ts --project experience --no-deps
test.skip(
  process.env.WORKSHOP_PROTOTYPES !== "enabled",
  "Set WORKSHOP_PROTOTYPES=enabled for the server and this test process to verify the gated prototype home.",
);

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

async function expectChapter(page: Page, index: number) {
  const chapter = chapters[index];
  await expect(controls(page).getByRole("button", { name: chapter.control, exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(controls(page).locator('[aria-pressed="true"]')).toHaveCount(1);
  await expect(scene(page).getByText(chapter.status, { exact: true })).toBeVisible();
  await expect(scene(page).getByText("$7,000.00", { exact: true }).first()).toBeVisible();
  if (index < 2) {
    await expect(scene(page).getByText("$10,000.00", { exact: true }).first()).toBeVisible();
    await expect(scene(page).getByText("$0.00", { exact: true })).toBeVisible();
  } else {
    await expect(scene(page).getByText("$3,000.00", { exact: true }).first()).toBeVisible();
    await expect(scene(page).getByText("$0.00", { exact: true })).toHaveCount(0);
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
