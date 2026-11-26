import { expect, it } from "bun:test";

it.each([
  ["domain", 'import "drizzle-orm";'],
  ["application", 'import "../infrastructure/postgres-requests";'],
])("rejects a persistence dependency injected into the %s boundary", (layer, input) => {
  const result = Bun.spawnSync([
    process.execPath, "--bun",
    "node_modules/eslint/bin/eslint.js",
    "--format", "json",
    "--stdin", "--stdin-filename", `src/modules/procurement/${layer}/boundary-fixture.ts`,
  ], { stdin: new TextEncoder().encode(input), timeout: 10_000 });
  expect(result.exitCode, result.stderr.toString()).toBe(1);
  const [{ messages }] = JSON.parse(result.stdout.toString());
  expect(messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "no-restricted-imports", severity: 2 }),
  ]));
}, 15_000);
