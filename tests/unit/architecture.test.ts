import { spawnSync } from "node:child_process";
import { expect, it } from "vitest";

it.each([
  ["domain/boundary-fixture.ts", 'import "drizzle-orm";', "no-restricted-imports"],
  ["domain/float-fixture.ts", 'export const bad = Number.parseFloat("12.34");', "no-restricted-properties"],
  ["application/boundary-fixture.ts", 'import "../infrastructure/postgres-requests";', "no-restricted-imports"],
  ["infrastructure/boundary-fixture.ts", 'import { cookies } from "next/headers";\nexport const c = cookies;', "no-restricted-imports"],
])("rejects architectural boundary violation in %s", (relativePath, input, expectedRule) => {
  const result = spawnSync(
    process.execPath,
    [
      "--bun",
      "node_modules/eslint/bin/eslint.js",
      "--format",
      "json",
      "--stdin",
      "--stdin-filename",
      `src/modules/procurement/${relativePath}`,
    ],
    { input, encoding: "utf8", timeout: 15_000 },
  );
  expect(result.status, result.stderr).toBe(1);
  const [{ messages }] = JSON.parse(result.stdout);
  expect(messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: expectedRule, severity: 2 }),
  ]));
});

it("rejects direct database imports inside UI components", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--bun",
      "node_modules/eslint/bin/eslint.js",
      "--format",
      "json",
      "--stdin",
      "--stdin-filename",
      "src/app/bad-component.tsx",
    ],
    { input: 'import { getLabDatabase } from "../server/db/lab-database";\nexport const x = getLabDatabase;\n', encoding: "utf8", timeout: 15_000 },
  );
  expect(result.status, result.stderr).toBe(1);
  const [{ messages }] = JSON.parse(result.stdout);
  expect(messages).toEqual(expect.arrayContaining([
    expect.objectContaining({ ruleId: "no-restricted-imports", severity: 2 }),
  ]));
});
