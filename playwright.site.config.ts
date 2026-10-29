import { defineConfig, devices } from "@playwright/test";

// Screenshot regression of the BUILT landing site: run `yarn site:build`
// first. Kept apart from playwright.config.ts (engine e2e, Chromium +
// WebKit, no server) so `yarn test:e2e` never starts a server.
const PORT = 4173;

export default defineConfig({
  testDir: "e2e-site",
  // A stray `test.only` would silently skip the rest of the suite in CI.
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  timeout: 120_000,
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never" }]]
    : "list",
  // Baselines carry the platform; only `-linux` files (rendered by
  // .github/workflows/visual-update.yml) are committed, see .gitignore.
  snapshotPathTemplate:
    "{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}",
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    // site/src/styles/base.css `prefers-reduced-motion: reduce` turns off
    // smooth scrolling and the marquee / cursor / arrow loops.
    reducedMotion: "reduce",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `yarn workspace site preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
