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

/**
 * A translucent alias `$ink/60` is a real `color-mix()` over a base that
 * differs per mode (`ink` is black in light and white under
 * `html[data-theme="dark"]`), and Tailwind's `/50` modifier stacks a second
 * `color-mix()` on the holder. Colours are compared as numbers, per channel,
 * because Chromium and WebKit serialise a computed `color-mix()` differently.
 */
test.describe("translucent alias $key/<n> in a real engine", () => {
  const { css } = generate(
    {
      colors: { ink: "#000000", scrim: "$ink/60" },
      themeAxes: { theme: { dark: { colors: { ink: "#ffffff" } } } },
    },
    { spacing: { enabled: false }, coverage: { colors: { keys: "aliased" } } },
  );

  type Channels = [number, number, number, number];

  /**
   * @param {Page} page - The page to render into
   * @returns {Promise<void>} Resolves once the fixture is mounted
   */
  const mount = async (page: Page) => {
    const compiled = await compileFixtureCss(css, ["bg-scrim", "bg-scrim/50"]);
    await page.setContent(`<!DOCTYPE html>
<html>
  <head><style>${compiled}</style></head>
  <body>
    <div id="holder" class="bg-scrim">holder</div>
    <div id="half" class="bg-scrim/50">half</div>
  </body>
</html>`);
  };

  /**
   * @param {Page} page - The mounted page
   * @param {string} id - Element id
   * @returns {Promise<Channels>} Computed background as r, g, b (0–255) and alpha (0–1)
   */
  const channels = (page: Page, id: string): Promise<Channels> =>
    page.evaluate((elementId) => {
      const probe = document.createElement("canvas").getContext("2d");
      const element = document.getElementById(elementId);
      if (!probe || !element) throw new Error("fixture not mounted");
      probe.fillStyle = getComputedStyle(element).backgroundColor;
      probe.clearRect(0, 0, 1, 1);
      probe.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = probe.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    }, id);

  const expectChannels = (actual: Channels, expected: Channels) => {
    for (const index of [0, 1, 2]) {
      expect(
        Math.abs((actual[index] ?? 0) - (expected[index] ?? 0)),
      ).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(actual[3] - expected[3])).toBeLessThanOrEqual(0.01);
  };

  test("light: black at 60%, and 30% under /50", async ({ page }) => {
    await mount(page);
    expectChannels(await channels(page, "holder"), [0, 0, 0, 0.6]);
    expectChannels(await channels(page, "half"), [0, 0, 0, 0.3]);
  });

  test("dark: the same alias is white at 60%, and 30% under /50", async ({
    page,
  }) => {
    await mount(page);
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
    });
    expectChannels(await channels(page, "holder"), [255, 255, 255, 0.6]);
    expectChannels(await channels(page, "half"), [255, 255, 255, 0.3]);
  });
});
