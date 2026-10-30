import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

import { pinFonts } from "./pin-fonts";

/**
 * Visual regression of the built landing site: every route × viewport ×
 * site theme, full page, against the committed `-linux` baselines
 * (`yarn test:visual`; baselines come from .github/workflows/visual-update.yml).
 * Readiness is read from test-only hooks (`data-testid`, `data-reveal-state`),
 * never from classes, so markup refactors keep the guards working.
 */
const ROUTES = [
  { name: "landing", path: "/" },
  { name: "docs", path: "/docs/architecture" },
  { name: "examples", path: "/examples" },
] as const;

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
] as const;

const THEMES = ["light", "dark"] as const;

/**
 * Full pages are captured in slices of this height (px). One Chromium image
 * cannot exceed 16384 px; 1800 px (about two desktop viewports) keeps every
 * baseline tile readable when reviewed and keeps a diff local to its tile.
 */
const SLICE = 1800;

/**
 * Scrolls top to bottom in half-viewport steps, two frames per step, so
 * every IntersectionObserver (`use-reveal.ts`, `terminal-typewriter.tsx`)
 * fires, then returns to the top.
 * @param {Page} page - Page under test
 * @returns {Promise<void>} Resolves at scrollY 0 after two frames
 */
const scrollThrough = async (page: Page): Promise<void> => {
  await page.evaluate(async () => {
    const step = Math.floor(window.innerHeight / 2);
    const bottom = document.documentElement.scrollHeight;
    for (let y = 0; y < bottom + step; y += step) {
      window.scrollTo({ top: y, behavior: "instant" });
      for (let frame = 0; frame < 2; frame++) {
        await new Promise<number>((done) => {
          requestAnimationFrame(done);
        });
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    for (let frame = 0; frame < 2; frame++) {
      await new Promise<number>((done) => {
        requestAnimationFrame(done);
      });
    }
  });
};

/**
 * Waits until a route is fully rendered and in its final, deterministic state.
 * @param {Page} page - Page under test
 * @param {string} route - Route name from ROUTES
 * @returns {Promise<void>} Resolves when the page is ready for a screenshot
 */
const settle = async (page: Page, route: string): Promise<void> => {
  await page.waitForLoadState("networkidle");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  if (route === "examples") {
    await expect(page).toHaveURL(/\/examples\/v4$/);
    await expect(
      page
        .frameLocator('[data-testid="example-preview"]')
        .locator("#root > *")
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  }
  await scrollThrough(page);
  if (route === "landing") {
    // The hook must exist first: a zero count would make the next check vacuous.
    await expect
      .poll(() => page.locator("[data-reveal-state]").count())
      .toBeGreaterThan(0);
    await expect(page.locator('[data-reveal-state="pending"]')).toHaveCount(0);
    // Every terminal line exists from the first paint (hidden), so the cursor
    // count alone would pass early: wait until none is still pending.
    await expect(
      page.getByTestId("terminal-body").locator('[data-line-state="pending"]'),
    ).toHaveCount(0, { timeout: 15_000 });
    await expect(
      page.getByTestId("terminal-body").getByTestId("terminal-cursor"),
    ).toHaveCount(1, { timeout: 15_000 });
  }
};

for (const route of ROUTES) {
  for (const viewport of VIEWPORTS) {
    for (const theme of THEMES) {
      test(`${route.name} ${viewport.name} ${theme}`, async ({ page }) => {
        const fonts = await pinFonts(page);
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.addInitScript((value) => {
          window.localStorage.setItem("sg-site-theme", value);
        }, theme);
        await page.goto(route.path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await settle(page, route.name);
        const height = await page.evaluate(
          () => document.documentElement.scrollHeight,
        );
        for (let part = 0; part * SLICE < height; part++) {
          const y = part * SLICE;
          await expect(page).toHaveScreenshot(
            `${route.name}-${viewport.name}-${theme}-p${String(part)}.png`,
            {
              fullPage: true,
              clip: {
                x: 0,
                y,
                width: viewport.width,
                height: Math.min(SLICE, height - y),
              },
            },
          );
        }
        // No request reached fonts.googleapis.com / fonts.gstatic.com.
        expect(fonts.unpinned).toEqual([]);
        expect(fonts.served.length).toBeGreaterThan(0);
      });
    }
  }
}
