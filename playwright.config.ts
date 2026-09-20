import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 30000,
  expect: { timeout: 10000 },
  reporter: "list",
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}
  },
  projects: [
    { name: "mobile-chromium", use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "desktop-chromium", use: { viewport: { width: 1440, height: 1000 } } }
  ],
  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: "node node_modules/next/dist/bin/next start --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 60000
  }
});
