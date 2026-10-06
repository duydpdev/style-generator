import { test, expect } from "@playwright/test";

import { generate } from "../src/core/generate";
import { defineTheme } from "../src/core/defineTheme";
import { compileFixtureCss } from "../src/__integration__/compileFixtureCss";
import { resolveSpacing } from "../src/features/spacing/spacingHelpers";

/**
 * The spacing fallback chain must follow custom `screens`/`breakpoints`
 * options, not the default `md`/`lg` widths: below 800px the base value
 * applies, from 800px the `md` value, from 1300px the `xl` value.
 */
test.describe("spacing chain at custom breakpoints", () => {
  test("spacing chain follows custom screens at md 800px and xl 1300px", async ({
    page,
  }) => {
    const { css } = generate(defineTheme({ colors: { primary: "#3B82F6" } }), {
      screens: { md: "800px", xl: "1300px" },
      breakpoints: ["md", "xl"],
    });
    const compiledCss = await compileFixtureCss(css, ["sp-p"]);
    const box = resolveSpacing<"md" | "xl">("p", { base: 2, md: 4, xl: 8 });

    const toStyleAttr = (style: Record<string, string>): string =>
      Object.entries(style)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");

    await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <style>${compiledCss}</style>
  </head>
  <body>
    <div id="box" class="${box.className}" style="${toStyleAttr(box.style)}"></div>
  </body>
</html>`);

    for (const [width, expected] of [
      [799, "8px"],
      [800, "16px"],
      [1299, "16px"],
      [1300, "32px"],
    ] as const) {
      await page.setViewportSize({ width, height: 768 });
      const paddingTop = await page.evaluate(() => {
        const el = document.getElementById("box");
        return el ? getComputedStyle(el).paddingTop : null;
      });
      expect(paddingTop, `padding-top at ${String(width)}px`).toBe(expected);
    }
  });
});
