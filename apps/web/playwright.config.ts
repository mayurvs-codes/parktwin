import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000, // multi-page journeys compile pages on first visit in dev
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "../../docs/evidence/3d-voice-violation/e2e/report", open: "never" }],
    ["json", { outputFile: "../../docs/evidence/3d-voice-violation/e2e/playwright-report.json" }],
  ],
  outputDir: "../../docs/evidence/3d-voice-violation/e2e/test-results",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on",
    video: "on",
    screenshot: "on",
    launchOptions: {
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
