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
 * child's `@media (width >= 768px)` fallback chain resolves to the child's
 * own `--sg-sp-p` instead of the parent's inherited `--sg-sp-p-md`.
 *
 * Runs on both Chromium and Webkit (playwright.config.ts projects) because
 * `@property` inheritance semantics are engine-sensitive — the original
 * PoC only ran on WebKit.
 */
test.describe("spacing custom-property inheritance", () => {
  // Parent: base 2 (8px), md 8 (32px), no lg → lg falls back to md.
  // Child: base 4 (16px) only → never picks up the parent's md value.
  const cases = [
    { width: 767, parent: "8px", child: "16px" },
    { width: 768, parent: "32px", child: "16px" },
    { width: 1024, parent: "32px", child: "16px" },
    { width: 1280, parent: "32px", child: "16px" },
  ];

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

    await page.setContent(`<!DOCTYPE html>
<html>
  <head>
    <style>${compiledCss}</style>
  </head>
  <body>
    <div id="parent" class="${parent.className}" style="${toStyleAttr(parent.style)}">
      <div id="child" class="${child.className}" style="${toStyleAttr(child.style)}"></div>
    </div>
  </body>
</html>`);

    const paddingOf = (id: string): Promise<string | null> =>
      page.evaluate((elementId) => {
        const el = document.getElementById(elementId);
        return el ? getComputedStyle(el).padding : null;
      }, id);

    for (const { width, parent: parentPadding, child: childPadding } of cases) {
      await page.setViewportSize({ width, height: 768 });
      expect(await paddingOf("parent"), `parent @ ${String(width)}px`).toBe(
        parentPadding,
      );
      expect(await paddingOf("child"), `child @ ${String(width)}px`).toBe(
        childPadding,
      );
    }
  });
});
