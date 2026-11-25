import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

import { generate } from "../src/core/generate";
import { compileFixtureCss } from "../src/__integration__/compileFixtureCss";

/**
 * A named `opacity` key works as a colour modifier (`bg-primary/muted`) and as
 * an element opacity (`opacity-muted`) in a real engine. Tailwind inlines
 * `--opacity-muted` into `color-mix()`, which takes only a percentage, so the
 * `@theme inline` mapping multiplies the 0–1 `--sg-opacity-*` number by
 * `100%`. The negative control restores the plain `var()` mapping and shows
 * the colour turning transparent.
 */
test.describe("named opacity key as a colour modifier", () => {
  const { css } = generate(
    { colors: { primary: "#ff0000" }, opacity: { muted: 0.5 } },
    { spacing: { enabled: false } },
  );
  const MAPPING = "--opacity-muted: calc(var(--sg-opacity-muted) * 100%);";

  /**
   * @param {Page} page - The page to render into
   * @param {string} themeCss - Generated theme CSS
   * @returns {Promise<{ alpha: number; opacity: string }>} The computed background alpha and element opacity
   */
  const render = async (page: Page, themeCss: string) => {
    const compiled = await compileFixtureCss(themeCss, [
      "bg-primary/muted",
      "opacity-muted",
    ]);
    await page.setContent(`<!DOCTYPE html>
<html>
  <head><style>${compiled}</style></head>
  <body>
    <div id="bg" class="bg-primary/muted">bg</div>
    <div id="op" class="opacity-muted">op</div>
  </body>
</html>`);
    return page.evaluate(() => {
      const probe = document.createElement("canvas").getContext("2d");
      const style = (id: string) => {
        const element = document.getElementById(id);
        if (!element) throw new Error(`no #${id}`);
        return getComputedStyle(element);
      };
      if (!probe) throw new Error("no 2d context");
      // Normalise any computed colour syntax through a 1×1 canvas pixel.
      probe.fillStyle = style("bg").backgroundColor;
      probe.fillRect(0, 0, 1, 1);
      const [, , , a = 0] = probe.getImageData(0, 0, 1, 1).data;
      return { alpha: a / 255, opacity: style("op").opacity };
    });
  };

  test("bg-primary/muted mixes the colour at 50%", async ({ page }) => {
    expect(css).toContain(MAPPING);
    const { alpha, opacity } = await render(page, css);
    expect(alpha).toBeCloseTo(0.5, 1);
    expect(opacity).toBe("0.5");
  });

  test("the plain var() mapping leaves the colour transparent (control)", async ({
    page,
  }) => {
    const plain = css.replace(
      MAPPING,
      "--opacity-muted: var(--sg-opacity-muted);",
    );
    expect(plain).not.toBe(css);
    const { alpha } = await render(page, plain);
    expect(alpha).toBe(0);
  });
});
