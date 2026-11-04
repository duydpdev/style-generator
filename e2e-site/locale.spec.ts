import { expect, test } from "@playwright/test";

import { pinFonts } from "./pin-fonts";

/**
 * Vietnamese docs (same config and server as site.spec.ts, no screenshots):
 * `/vi/docs/<slug>` renders the twin of `/docs/<slug>` with `<html lang="vi">`,
 * the breadcrumb switch round-trips, links in a twin stay under `/vi/docs/`
 * and every in-page anchor of a twin has its heading.
 */
test.describe("docs locale", () => {
  test("the switch round-trips between /vi/docs/guide and /docs/guide", async ({
    page,
  }) => {
    const fonts = await pinFonts(page);
    await page.goto("/vi/docs/guide");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await expect(page.locator("h1")).toContainText("Hướng dẫn tích hợp");
    const toEn = page.getByTestId("doc-locale-switch");
    await expect(toEn).toHaveAttribute("href", "/docs/guide");
    await toEn.click();
    await expect(page).toHaveURL(/\/docs\/guide$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator("h1")).toContainText("Guide");
    const toVi = page.getByTestId("doc-locale-switch");
    await expect(toVi).toHaveAttribute("href", "/vi/docs/guide");
    await toVi.click();
    await expect(page).toHaveURL(/\/vi\/docs\/guide$/);
    expect(fonts.unpinned).toEqual([]);
  });

  test("/vi/docs opens the Vietnamese introduction", async ({ page }) => {
    await pinFonts(page);
    await page.goto("/vi/docs");
    await expect(page).toHaveURL(/\/vi\/docs\/introduction$/);
    await expect(page.locator("h1")).toContainText("Giới thiệu");
  });

  test("links in a twin stay Vietnamese and its anchors resolve", async ({
    page,
  }) => {
    await pinFonts(page);
    await page.goto("/vi/docs/guide");
    const body = page.getByTestId("doc-body");
    await expect(body.locator('a[href^="/vi/docs/"]').first()).toBeAttached();
    await expect(body.locator('a[href^="/docs/"]')).toHaveCount(0);
    const anchors = await page.evaluate(() => {
      const ids = Array.from(
        document.querySelectorAll<HTMLAnchorElement>(
          '[data-testid="doc-body"] a[href^="#"]',
        ),
      ).map((a) =>
        decodeURIComponent((a.getAttribute("href") ?? "#").slice(1)),
      );
      return {
        total: ids.length,
        missing: ids.filter((id) => !document.getElementById(id)),
      };
    });
    expect(anchors.total).toBeGreaterThan(0);
    expect(anchors.missing).toEqual([]);
  });
});
