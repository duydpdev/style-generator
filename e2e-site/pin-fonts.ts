import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import type { Page } from "@playwright/test";

/** Pinned Google Fonts responses (regeneration procedure: documents/testing.md, section 7). Run from the repo root. */
const FONT_DIR = resolve("e2e-site/fixtures/fonts");
const FONT_HOST = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

/** Stylesheet URL → fixture file: site/index.html and examples/react-v4/index.html (the /examples iframe). */
const FONT_CSS: Readonly<Record<string, string>> = {
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap":
    "site.css",
  "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;500;600;700&display=swap":
    "react-v4.css",
};

/**
 * Serves every Google Fonts request of the page (iframes included) from
 * e2e-site/fixtures/fonts; a font URL without a fixture is aborted.
 * @param {Page} page - Page under test
 * @returns {Promise<{ served: string[]; unpinned: string[] }>} URLs served from fixtures, and font URLs that were not (must stay empty)
 */
export const pinFonts = async (
  page: Page,
): Promise<{ served: string[]; unpinned: string[] }> => {
  const served: string[] = [];
  const unpinned: string[] = [];
  await page.route(FONT_HOST, async (route) => {
    const url = route.request().url();
    const { hostname, pathname } = new URL(url);
    const isCss = hostname === "fonts.googleapis.com";
    const file = isCss
      ? FONT_CSS[decodeURIComponent(url)]
      : pathname.slice(1).replaceAll("/", "_");
    if (file === undefined || !existsSync(join(FONT_DIR, file))) {
      unpinned.push(url);
      await route.abort("blockedbyclient");
      return;
    }
    served.push(url);
    await route.fulfill({
      body: readFileSync(join(FONT_DIR, file)),
      contentType: isCss ? "text/css; charset=utf-8" : "font/woff2",
      headers: { "access-control-allow-origin": "*", "x-sg-fixture": "1" },
    });
  });
  // A font response without the fixture header reached the network.
  page.on("response", (response) => {
    if (
      FONT_HOST.test(response.url()) &&
      response.headers()["x-sg-fixture"] !== "1"
    ) {
      unpinned.push(response.url());
    }
  });
  return { served, unpinned };
};
