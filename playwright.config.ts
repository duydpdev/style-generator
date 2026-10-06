import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  // A stray `test.only` would silently skip the rest of the suite in CI.
  forbidOnly: !!process.env.CI,
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
