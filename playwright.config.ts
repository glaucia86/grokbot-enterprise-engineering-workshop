import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  retries: 0,
  timeout: 20_000,
  use: {
    baseURL: process.env.WORKSHOP_BASE_URL ?? "http://127.0.0.1:3000",
    launchOptions: { executablePath: process.env.WORKSHOP_CHROMIUM_PATH },
    trace: "retain-on-failure",
  },
});
