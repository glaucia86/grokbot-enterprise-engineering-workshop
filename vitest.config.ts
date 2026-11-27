import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    pool: "threads",
    include: ["tests/**/*.test.ts", "engineering/tests/**/*.test.ts"],
    exclude: ["tests/e2e/**", "slides/**", "node_modules/**", ".next/**", "artifacts/**"],
    testTimeout: 30_000,
    hookTimeout: 20_000,
  },
});
