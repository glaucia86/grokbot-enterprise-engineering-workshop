import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { relative } from "node:path";
import { expect, test, type APIRequestContext, type Page, type TestInfo } from "@playwright/test";
import postgres, { type Sql } from "postgres";
import { labConnectionString } from "../../../src/server/db/lab-config";

/*
 * UX-VS-00 experience baseline: captures the current UI per role, state and viewport, plus console,
 * network, overflow, fold and interaction-count observations. Opt-in so the AC-09 suite is unchanged:
 *   WORKSHOP_UX_CAPTURE=1 bun run verify:all --run-id <id>
 * All data goes into a disposable cost center that is deleted afterwards, so seeded budgets used by
 * the journeys and the security suite are never spent.
 */

test.skip(process.env.WORKSHOP_UX_CAPTURE !== "1", "Set WORKSHOP_UX_CAPTURE=1 to capture the experience baseline.");
test.describe.configure({ mode: "serial" });

const NORTHSTAR_TENANT_ID = "10000000-0000-4000-8000-000000000001";
const costCenter = { id: crypto.randomUUID(), code: "", name: "Facilities Maintenance Q4", allocatedBudgetMinor: 2_500_000 };
costCenter.code = "CC-FAC-" + costCenter.id.slice(0, 4).toUpperCase();
let database: Sql | undefined;

const viewports = [
  { name: "1920x1080", width: 1920, height: 1080, fullPage: false },
  { name: "1440x900", width: 1440, height: 900, fullPage: true },
  { name: "1280x720", width: 1280, height: 720, fullPage: false },
  { name: "768x1024", width: 768, height: 1024, fullPage: false },
  { name: "390x844", width: 390, height: 844, fullPage: true },
] as const;

type PrimaryAction = { role: "button" | "link"; name: string };
type Capture = {
  surface: string;
  identity: string;
  viewport: string;
  file: string;
  documentHeight: number;
  horizontalOverflowPx: number;
  primaryAction: { name: string; found: boolean; inViewport: boolean | null; topPx: number | null } | null;
};
type Journey = { name: string; interactions: number; steps: string[]; elapsedMs: number };

const captures: Capture[] = [];
const journeys: Journey[] = [];
const reflow: { surface: string; identity: string; horizontalOverflowPx: number }[] = [];
const issues: string[] = [];
const ids: Record<"approved" | "rejected" | "overLimit" | "approvable", string> = {
  approved: "",
  rejected: "",
  overLimit: "",
  approvable: "",
};

function watch(page: Page, context: string) {
  page.on("console", (message) => {
    if (message.type() === "error") issues.push(`${context} console: ${message.text()}`);
  });
  page.on("pageerror", (error) => issues.push(`${context} pageerror: ${error.message}`));
  page.on("requestfailed", (request) => issues.push(`${context} requestfailed: ${new URL(request.url()).pathname} ${request.failure()?.errorText ?? ""}`));
  page.on("response", (response) => {
    if (response.status() >= 400) issues.push(`${context} http ${response.status()}: ${response.request().method()} ${new URL(response.url()).pathname}`);
  });
}

async function selectIdentity(request: APIRequestContext, identity: string) {
  const response = await request.post("/api/lab/session", { data: { identity } });
  expect(response.ok(), `select ${identity}`).toBe(true);
}

async function submit(request: APIRequestContext, title: string, justification: string, amountMinor: number) {
  const response = await request.post("/api/purchase-requests", {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: { costCenterId: costCenter.id, title, justification, amountMinor, currency: "USD" },
  });
  expect(response.status(), `submit ${title}`).toBe(201);
  return ((await response.json()) as { id: string }).id;
}

async function decide(request: APIRequestContext, id: string, decision: "APPROVE" | "REJECT", reason?: string) {
  const response = await request.post(`/api/purchase-requests/${id}/decision`, {
    headers: { "Idempotency-Key": crypto.randomUUID() },
    data: reason ? { decision, reason } : { decision },
  });
  expect(response.status(), `${decision} ${id}`).toBe(200);
}

async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.evaluate(() => document.fonts.ready);
}

async function capture(page: Page, testInfo: TestInfo, surface: string, identity: string, path: string, primary: PrimaryAction | null) {
  watch(page, `${surface}/${identity}`);
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(path);
    await settle(page);
    const file = testInfo.outputPath(`${surface}--${identity}--${viewport.name}.png`);
    await page.screenshot({ path: file, fullPage: viewport.fullPage, animations: "disabled", caret: "hide" });
    const metrics = await page.evaluate(() => ({
      documentHeight: document.documentElement.scrollHeight,
      horizontalOverflowPx: document.documentElement.scrollWidth - window.innerWidth,
    }));
    let action: Capture["primaryAction"] = null;
    if (primary) {
      const locator = page.getByRole(primary.role, { name: primary.name, exact: true }).first();
      const box = (await locator.count()) ? await locator.boundingBox() : null;
      action = {
        name: primary.name,
        found: box !== null,
        inViewport: box ? box.y >= 0 && box.y + box.height <= viewport.height : null,
        topPx: box ? Math.round(box.y) : null,
      };
    }
    captures.push({ surface, identity, viewport: viewport.name, file, ...metrics, primaryAction: action });
  }
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto(path);
  await settle(page);
  reflow.push({
    surface,
    identity,
    horizontalOverflowPx: await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  });
}

test.beforeAll(async ({ playwright }, testInfo) => {
  database = postgres(labConnectionString(), { max: 1, connect_timeout: 3 });
  await database`
    insert into cost_centers (id, tenant_id, code, name, currency, allocated_budget_minor, committed_budget_minor)
    values (${costCenter.id}, ${NORTHSTAR_TENANT_ID}, ${costCenter.code}, ${costCenter.name}, 'USD', ${costCenter.allocatedBudgetMinor}, 0)
  `;
  const request = await playwright.request.newContext({ baseURL: testInfo.project.use.baseURL });
  try {
    await selectIdentity(request, "northstar-requester");
    ids.approved = await submit(request, "Pallet racking safety inspection", "Annual load inspection for aisles 1–6 before peak season.", 185_000);
    ids.rejected = await submit(request, "Forklift battery replacement", "Two lithium packs for the reach trucks on the night shift.", 420_000);
    ids.overLimit = await submit(request, "Cold-storage sensor retrofit", "Replace failing temperature probes in freezer bays B and C.", 600_000);
    const dockSeals = await submit(request, "Dock door seal replacement", "Reseal doors 1–8 to cut energy loss at the loading bays.", 1_800_000);
    ids.approvable = await submit(request, "Packing station anti-fatigue mats", "Ergonomic mats for the twelve outbound packing stations.", 95_000);

    await selectIdentity(request, "northstar-approver");
    await decide(request, ids.approved, "APPROVE");
    await decide(request, dockSeals, "APPROVE");
    await decide(request, ids.rejected, "REJECT", "Battery warranty claim is still open with the vendor.");
  } finally {
    await request.dispose();
  }
});

test.afterAll(async () => {
  if (!database) return;
  await database.begin(async (sql) => {
    const [{ exists: hasDecisionKeys }] = await sql<{ exists: boolean }[]>`
      select to_regclass('public.decision_idempotency_keys') is not null as exists
    `;
    if (hasDecisionKeys) {
      await sql`delete from decision_idempotency_keys where request_id in (select id from purchase_requests where cost_center_id = ${costCenter.id})`;
    }
    await sql`delete from financial_commitments where cost_center_id = ${costCenter.id}`;
    await sql`delete from audit_events where request_id in (select id from purchase_requests where cost_center_id = ${costCenter.id})`;
    await sql`delete from purchase_requests where cost_center_id = ${costCenter.id}`;
    await sql`delete from cost_centers where id = ${costCenter.id}`;
  });
  await database.end({ timeout: 3 });
});

test("landing (anonymous)", async ({ page }, testInfo) => {
  await capture(page, testInfo, "landing", "anonymous", "/", { role: "button", name: "Switch identity" });
});

for (const [identity, primary] of [
  ["northstar-requester", { role: "button", name: "Submit request" }],
  ["northstar-approver", { role: "link", name: "Review oldest" }],
  ["northstar-junior-approver", { role: "link", name: "Review oldest" }],
  ["northstar-auditor", { role: "link", name: "Inspect requests" }],
] as const) {
  test(`dashboard (${identity})`, async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    await selectIdentity(page.request, identity);
    await capture(page, testInfo, "dashboard", identity, "/", primary);
  });
}

for (const [surface, identity, key, primary] of [
  ["review-approvable", "northstar-approver", "approvable", { role: "button", name: "Save decision" }],
  ["review-insufficient-budget", "northstar-approver", "overLimit", { role: "button", name: "Save decision" }],
  ["review-over-limit", "northstar-junior-approver", "overLimit", { role: "button", name: "Save decision" }],
  ["detail-approved", "northstar-auditor", "approved", null],
  ["detail-rejected", "northstar-requester", "rejected", null],
] as const) {
  test(`${surface} (${identity})`, async ({ page }, testInfo) => {
    test.setTimeout(45_000);
    await selectIdentity(page.request, identity);
    await capture(page, testInfo, surface, identity, `/requests/${ids[key]}`, primary);
  });
}

for (const [surface, identity, message] of [
  ["decision-refused-over-limit", "northstar-junior-approver", "exceeds your organizational approval limit"],
  ["decision-refused-insufficient-budget", "northstar-approver", "Insufficient available budget"],
] as const) {
  test(`${surface} (${identity})`, async ({ page }, testInfo) => {
    watch(page, `${surface}/${identity}`);
    await selectIdentity(page.request, identity);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/requests/${ids.overLimit}`);
    const decision = page.getByRole("region", { name: "Record decision" });
    await decision.getByLabel("Decision").selectOption({ label: "Approve" });
    await decision.getByRole("button", { name: "Save decision" }).click();
    await expect(decision.getByRole("alert")).toContainText(message);
    await settle(page);
    const file = testInfo.outputPath(`${surface}--${identity}--1440x900.png`);
    await page.screenshot({ path: file, fullPage: true, animations: "disabled", caret: "hide" });
    captures.push({ surface, identity, viewport: "1440x900", file, documentHeight: 0, horizontalOverflowPx: 0, primaryAction: null });
  });
}

test("journey: requester submits a purchase request from the landing page", async ({ page }) => {
  watch(page, "journey/requester");
  await page.setViewportSize({ width: 1440, height: 900 });
  const started = Date.now();
  const steps: string[] = [];
  await page.goto("/");
  await page.getByLabel("Lab identity").selectOption("northstar-requester");
  steps.push("select lab identity");
  await page.getByRole("button", { name: "Switch identity" }).click();
  steps.push("switch identity");
  await expect(page.getByRole("heading", { name: "My requests" })).toBeVisible();
  await page.getByLabel("Cost center", { exact: true }).selectOption(costCenter.id);
  steps.push("choose cost center");
  await page.getByLabel("Title").fill("Thermal label printer ribbons");
  steps.push("enter title");
  await page.getByLabel("Justification").fill("Replacement ribbons for the four outbound label printers.");
  steps.push("enter justification");
  await page.getByLabel("Amount (USD cents)").fill("25000");
  steps.push("enter amount in cents");
  await page.getByRole("button", { name: "Submit request" }).click();
  steps.push("submit");
  await expect(page.getByRole("heading", { name: "Thermal label printer ribbons" })).toBeVisible();
  journeys.push({ name: "requester-submit", interactions: steps.length, steps, elapsedMs: Date.now() - started });
});

test("journey: approver approves a pending request from the landing page", async ({ page }) => {
  watch(page, "journey/approver");
  await page.setViewportSize({ width: 1440, height: 900 });
  const started = Date.now();
  const steps: string[] = [];
  await page.goto("/");
  await page.getByLabel("Lab identity").selectOption("northstar-approver");
  steps.push("select lab identity");
  await page.getByRole("button", { name: "Switch identity" }).click();
  steps.push("switch identity");
  await expect(page.getByRole("heading", { name: "Tenant requests" })).toBeVisible();
  await page.getByRole("link", { name: "Packing station anti-fatigue mats" }).first().click();
  steps.push("open request from table");
  const decision = page.getByRole("region", { name: "Record decision" });
  await decision.getByLabel("Decision").selectOption({ label: "Approve" });
  steps.push("choose Approve in select");
  await decision.getByRole("button", { name: "Save decision" }).click();
  steps.push("save decision");
  await expect(page.getByRole("article").getByRole("status")).toHaveText("APPROVED");
  journeys.push({ name: "approver-approve", interactions: steps.length, steps, elapsedMs: Date.now() - started });
});

test("write capture index", async () => {
  const testInfo = test.info();
  const outputRoot = testInfo.project.outputDir;
  const files = await Promise.all(captures.map(async (entry) => ({
    ...entry,
    file: relative(outputRoot, entry.file).replaceAll("\\", "/"),
    sha256: createHash("sha256").update(await readFile(entry.file)).digest("hex"),
  })));
  const index = {
    schemaVersion: 1,
    purpose: "UX-VS-00 experience baseline (observational; not a pass/fail gate)",
    viewports,
    captures: files,
    reflow320: reflow,
    journeys,
    issues,
    limitations: [
      "Northstar dashboards also show rows left by the journey specs, which run first (Playwright project dependency).",
      "The PH-42 overspend state cannot exist on the solution schema (CHECK constraint); capture it from a starter-edition rehearsal.",
      "Screenshots are taken with CSS animations disabled; motion is not evaluated here.",
      "HTTP 403 and 409 issues from the decision-refused captures are the expected server refusals.",
    ],
  };
  await writeFile(testInfo.outputPath("ux-baseline-index.json"), JSON.stringify(index, null, 2) + "\n");
  expect(files.length).toBeGreaterThan(0);
});
