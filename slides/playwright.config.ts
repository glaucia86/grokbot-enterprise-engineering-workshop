import { defineConfig } from "@playwright/test";
import { root } from "../engineering/runtime";

const baseURL = "http://127.0.0.1:4173";

export default defineConfig({
  testDir: ".",
  testMatch: "deck.spec.ts",
  outputDir: "../test-results/slides",
  timeout: 15_000,
  use: {
    baseURL,
    launchOptions: { executablePath: process.env.WORKSHOP_CHROMIUM_PATH },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "bun slides/serve.ts",
    cwd: root,
    url: baseURL + "/workshop/",
  },
});
