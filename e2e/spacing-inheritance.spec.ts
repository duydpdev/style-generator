import { test, expect } from "@playwright/test";

import { generate } from "../src/core/generate";
import { defineTheme } from "../src/core/defineTheme";
import { compileFixtureCss } from "../src/__integration__/compileFixtureCss";
import { resolveSpacing } from "../src/features/spacing/spacingHelpers";

/**
 * Regression test for the DEV.2 `--tw-sp-*` custom-property inheritance bug
 * (D8 fix): a parent's breakpoint override must NOT leak into a child that
 * only sets the base value. `@property --sg-sp-*` with `inherits: false`
 * scopes each custom property to the element it's declared on, so the
 * child's `@media (width >= 48rem)` fallback chain resolves to the child's
 * own `--sg-sp-p` instead of the parent's inherited `--sg-sp-p-md`.
 *
 * Runs on both Chromium and Webkit (playwright.config.ts projects) because
 * `@property` inheritance semantics are engine-sensitive — the original
 * PoC only ran on WebKit.
 */
test.describe("spacing custom-property inheritance", () => {
  test("child padding does not inherit parent's breakpoint override", async ({
    page,
  }) => {
    const theme = defineTheme({ colors: { primary: "#3B82F6" } });
    const { css } = generate(theme);
    const compiledCss = await compileFixtureCss(css, ["sp-p"]);

    const parent = resolveSpacing("p", { base: 2, md: 8 });
    const child = resolveSpacing("p", 4);

    const toStyleAttr = (style: Record<string, string>): string =>
      Object.entries(style)
        .map(([k, v]) => `${k}:${v}`)
        .join(";");

    await page.setViewportSize({ width: 1024, height: 768 });
    await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <style>${compiledCss}</style>
  </head>
  <body>
    <div class="${parent.className}" style="${toStyleAttr(parent.style)}">
      <div id="child" class="${child.className}" style="${toStyleAttr(child.style)}"></div>
    </div>
  </body>
</html>`);

    const childPadding = await page.evaluate(() => {
      const el = document.getElementById("child");
      return el ? getComputedStyle(el).padding : null;
    });

    expect(childPadding).toBe("16px");
  });
});
