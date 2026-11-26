import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: ["src/modules/procurement/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["*"] }],
    },
  },
  {
    files: ["src/modules/procurement/application/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{
        regex: String.raw`^(?!\./[\w.-]+$|\.\./domain/[\w.-]+$)`,
        message: "Application code may use its own modules and the procurement domain.",
      }] }],
    },
  },
  globalIgnores([".next/**", "artifacts/**", "playwright-report/**", "test-results/**", "next-env.d.ts"]),
]);
