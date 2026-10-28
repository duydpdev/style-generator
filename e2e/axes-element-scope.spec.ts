import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

import { generate } from "../src/core/generate";
import type { ThemeConfig } from "../src/core/themeSchema";
import { compileFixtureCss } from "../src/__integration__/compileFixtureCss";

/**
 * Browser proof of the premise behind `axes.scope: "element"` and the
 * stale-alias check in `generate()`: a `$`-alias custom property
 * (`--sg-color-accent: var(--sg-color-primary)`) is computed where it is
 * DECLARED. A `[data-mode="dark"]` element that only overrides the target
 * therefore leaves a base-declared holder on its `:root` value, while a
 * holder re-declared in the variant block follows the override.
 */
test.describe('axes.scope "element" — nested element and alias holders', () => {
  const RED = "rgb(255, 0, 0)";
  const BLUE = "rgb(0, 0, 255)";

  // `accent` is re-declared in the variant, so `generate()` accepts it.
  const validTheme: ThemeConfig = {
    colors: { primary: "#ff0000", accent: "$primary" },
    themeAxes: {
      theme: { dark: { colors: { primary: "#0000ff", accent: "$primary" } } },
    },
  };

  // `soft` is a base-only holder: `generate()` rejects this for scope
  // "element", so the fixture below is the scope "root" output re-anchored.
  const staleTheme: ThemeConfig = {
    colors: { primary: "#ff0000", soft: "$primary" },
    themeAxes: { theme: { dark: { colors: { primary: "#0000ff" } } } },
  };

  /**
   * Renders `css` with `<div id="outer"><div id="nested" data-mode="dark">`
   * and reads the colour a custom property resolves to on each element.
   * @param {Page} page - Playwright page
   * @param {string} css - `generate().css`, compiled with Tailwind first
   * @param {string} property - Custom property to read, e.g. `--sg-color-accent`
   * @returns {Promise<{ outer: string; nested: string }>} Computed `background-color` on `#outer` and `#nested`
   */
  const colorsOf = async (
    page: Page,
    css: string,
    property: string,
  ): Promise<{ outer: string; nested: string }> => {
    await page.setContent(`<!DOCTYPE html>
<html>
  <head><style>${await compileFixtureCss(css, [])}</style></head>
  <body>
    <div id="outer"><div id="nested" data-mode="dark"></div></div>
  </body>
</html>`);
    return page.evaluate((name) => {
      const read = (id: string): string => {
        const el = document.getElementById(id);
        if (!el) throw new Error(`#${id} missing`);
        el.style.backgroundColor = `var(${name})`;
        return getComputedStyle(el).backgroundColor;
      };
      return { outer: read("outer"), nested: read("nested") };
    }, property);
  };

  const elementOptions = {
    axes: { scope: "element", attribute: { theme: "data-mode" } },
  } as const;

  test("the override applies to the nested element only", async ({ page }) => {
    const css = generate(validTheme, elementOptions).css;
    expect(await colorsOf(page, css, "--sg-color-primary")).toEqual({
      outer: RED,
      nested: BLUE,
    });
  });

  test("a holder re-declared in the variant follows the variant", async ({
    page,
  }) => {
    const css = generate(validTheme, elementOptions).css;
    expect(await colorsOf(page, css, "--sg-color-accent")).toEqual({
      outer: RED,
      nested: BLUE,
    });
  });

  test("a base-only holder keeps the :root value (why generate() rejects it)", async ({
    page,
  }) => {
    const css = generate(staleTheme, {
      axes: { attribute: { theme: "data-mode" } },
    }).css.replace('html[data-mode="dark"]', '[data-mode="dark"]');
    expect(css).toContain('\n[data-mode="dark"] {');

    expect(await colorsOf(page, css, "--sg-color-primary")).toEqual({
      outer: RED,
      nested: BLUE,
    });
    // `soft` was computed on :root: the nested element inherits red.
    expect(await colorsOf(page, css, "--sg-color-soft")).toEqual({
      outer: RED,
      nested: RED,
    });
  });
});
