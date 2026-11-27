import { spawnSync } from "node:child_process";

type BoundaryFixture = {
  name: string;
  virtualFile: string;
  code: string;
  expectedRule: string;
};

const fixtures: BoundaryFixture[] = [
  {
    name: "domain-forbids-drizzle",
    virtualFile: "src/modules/procurement/domain/violation-fixture.ts",
    code: 'import { eq } from "drizzle-orm";\nexport const invalid = eq;\n',
    expectedRule: "no-restricted-imports",
  },
  {
    name: "domain-forbids-float-parsing",
    virtualFile: "src/modules/procurement/domain/float-fixture.ts",
    code: 'export const badMoney = Number.parseFloat("10.50");\n',
    expectedRule: "no-restricted-properties",
  },
  {
    name: "application-forbids-infrastructure",
    virtualFile: "src/modules/procurement/application/violation-fixture.ts",
    code: 'import { postgresRequests } from "../infrastructure/postgres-requests";\nexport const leak = postgresRequests;\n',
    expectedRule: "no-restricted-imports",
  },
  {
    name: "infrastructure-forbids-next-headers",
    virtualFile: "src/modules/procurement/infrastructure/violation-fixture.ts",
    code: 'import { cookies } from "next/headers";\nexport const leak = cookies;\n',
    expectedRule: "no-restricted-imports",
  },
  {
    name: "ui-forbids-direct-database",
    virtualFile: "src/app/violation-fixture.tsx",
    code: 'import { getLabDatabase } from "../server/db/lab-database";\nexport function Bad() { return String(Boolean(getLabDatabase)); }\n',
    expectedRule: "no-restricted-imports",
  },
];

function checkFixture(fixture: BoundaryFixture) {
  const result = spawnSync(
    process.execPath,
    [
      "--bun",
      "node_modules/eslint/bin/eslint.js",
      "--format",
      "json",
      "--stdin",
      "--stdin-filename",
      fixture.virtualFile,
    ],
    { input: fixture.code, encoding: "utf8", timeout: 15_000 },
  );

  if (result.status !== 1) {
    return {
      name: fixture.name,
      file: fixture.virtualFile,
      rejected: false,
      detail: `Expected ESLint exit 1, got ${result.status}. ${result.stderr}`,
    };
  }

  const parsed = JSON.parse(result.stdout) as { messages: { ruleId: string; severity: number; message: string }[] }[];
  const match = parsed[0]?.messages.find(
    (entry) => entry.ruleId === fixture.expectedRule && entry.severity === 2,
  );
  return {
    name: fixture.name,
    file: fixture.virtualFile,
    rejected: Boolean(match),
    ruleId: match?.ruleId ?? null,
    diagnostic: match?.message ?? "Expected rule did not trigger.",
  };
}

const results = fixtures.map(checkFixture);
const passed = results.every((entry) => entry.rejected);
console.log(JSON.stringify({ status: passed ? "pass" : "fail", fixtures: results }, null, 2));
if (!passed) process.exitCode = 1;
