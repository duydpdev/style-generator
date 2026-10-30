import { expect, test } from "@playwright/test";

import { pinFonts } from "./pin-fonts";

/**
 * Layout guard of the built site (same config and server as site.spec.ts):
 * no route may scroll sideways at the three reference viewports, the topbar
 * menu must reach the page links on narrow screens, and the theme toggle must
 * stay inside the viewport.
 */
const ROUTES = [
  "/",
  "/docs/architecture",
  "/docs/guide",
  "/docs/testing",
  "/docs/deploy",
  "/examples/v4",
] as const;

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`layout ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const route of ROUTES) {
      test(`${route} has no horizontal overflow`, async ({ page }) => {
        const fonts = await pinFonts(page);
        await page.goto(route);
        await page.waitForLoadState("networkidle");
        await page.evaluate(async () => {
          await document.fonts.ready;
        });
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
        expect(fonts.unpinned).toEqual([]);
      });
    }

    if (viewport.width <= 860) {
      test("topbar menu opens the page links", async ({ page }) => {
        await page.goto("/");
        const menu = page.getByRole("button", { name: "Menu" });
        const nav = page.getByRole("navigation", { name: "Pages" });
        await expect(menu).toBeVisible();
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await expect(nav).toBeHidden();

        await menu.click();
        await expect(menu).toHaveAttribute("aria-expanded", "true");
        await expect(nav.locator('a[href="/docs"]')).toBeVisible();
        await expect(nav.locator('a[href="/examples/v4"]')).toBeVisible();

        await page.keyboard.press("Escape");
        await expect(menu).toHaveAttribute("aria-expanded", "false");
        await expect(nav).toBeHidden();

        await menu.click();
        await nav.locator('a[href="/examples/v4"]').click();
        await expect(page).toHaveURL(/\/examples\/v4$/);
        await expect(
          page.getByRole("button", { name: "Menu" }),
        ).toHaveAttribute("aria-expanded", "false");
      });
    }

    if (viewport.name === "mobile") {
      test("theme toggle stays inside the viewport", async ({ page }) => {
        await page.goto("/");
        const toggle = page.getByRole("button", { name: "Toggle theme" });
        await expect(toggle).toBeVisible();
        const box = await toggle.boundingBox();
        expect(box).not.toBeNull();
        if (box) {
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        }
      });
    }
  });
}
