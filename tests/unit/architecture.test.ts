import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it.each([
  ["domain", 'import "drizzle-orm";'],
  ["application", 'import "../infrastructure/postgres-requests";'],
])("rejects a persistence dependency injected into the %s boundary", (layer, input) => {
  const result = spawnSync(process.execPath, [
    "node_modules/eslint/bin/eslint.js",
    "--format", "json",
    "--stdin", "--stdin-filename", `src/modules/procurement/${layer}/boundary-fixture.ts`,
  ], { input, encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stderr).toBe(1);
  const [{ messages }] = JSON.parse(result.stdout);
  expect(messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "no-restricted-imports", severity: 2 }),
  ]));
}, 15_000);
