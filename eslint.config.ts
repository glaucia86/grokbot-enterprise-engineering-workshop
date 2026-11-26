import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/modules/procurement/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^(?!\./[\w.-]+$)`,
              message:
                "Domain modules must remain pure and import only sibling domain modules (no framework, database, or infrastructure dependencies).",
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "parseFloat",
          message: "Use exact integer minor units (MoneyMinor) instead of floating-point parsing in the domain layer.",
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Number",
          property: "parseFloat",
          message: "Use exact integer minor units (MoneyMinor) instead of floating-point parsing in the domain layer.",
        },
      ],
    },
  },
  {
    files: ["src/modules/procurement/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              regex: String.raw`^(?!\./[\w.-]+$|\.\./domain/[\w.-]+$)`,
              message:
                "Application use cases may import only sibling application modules and the procurement domain (never infrastructure, Next.js, or database drivers).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/procurement/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["next/*", "react", "react-dom", "**/app/**", "**/server/auth/**", "**/server/http/**"],
              message:
                "Infrastructure persistence adapters must not import Next.js UI, React, HTTP response helpers, or session controllers.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/app/**/*.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "drizzle-orm",
                "drizzle-orm/*",
                "postgres",
                "**/modules/procurement/infrastructure/**",
                "**/server/db/lab-database*",
                "**/server/db/schema*",
              ],
              message:
                "UI components must not import database clients, Drizzle schemas, or infrastructure adapters directly; route through application services.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "artifacts/**", "playwright-report/**", "test-results/**", "next-env.d.ts", "starter-kit/**"]),
]);
