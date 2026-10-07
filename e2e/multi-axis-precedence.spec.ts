import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Page } from "@playwright/test";
import { test, expect } from "@playwright/test";

import { generate } from "../src/core/generate";
import { defineTheme } from "../src/core/defineTheme";
import { ThemeSchema } from "../src/core/themeSchema";
import { compileFixtureCss } from "../src/__integration__/compileFixtureCss";

/**
 * Regression test for DEV.6 multi-axis (`themeAxes`) precedence: when two
 * axes both override the same token, the last-declared axis in the config
 * must win (CSS source order, since both axis selectors are
 * `html[data-<axis>="<variant>"]` — same specificity). Runs on both
 * Chromium and Webkit (playwright.config.ts projects) because the
 * `--sg-*` custom-property cascade is engine-sensitive (see the
 * spacing-inheritance spec and the DEV.5 carry-forward note on `var()`
 * alias resolution).
 *
 * `--color-primary` (the `@theme inline` mapped var) is NOT asserted here:
 * Tailwind v4 inlines `@theme inline` values directly into each utility
 * declaration (`.bg-primary { background-color: var(--sg-color-primary); }`)
 * instead of emitting `--color-primary` as a real custom property, so it
 * never exists at runtime for `getComputedStyle` to read. `--sg-color-primary`
 * is the meaningful, actually-declared property.
 */
test.describe("themeAxes precedence — two axes overriding the same token", () => {
  const buildSyntheticTheme = (order: "theme-first" | "palette-first") =>
    defineTheme({
      colors: { primary: "#111111" },
      themeAxes:
        order === "theme-first"
          ? {
              theme: { dark: { colors: { primary: "#222222" } } },
              palette: { rose: { colors: { primary: "#333333" } } },
            }
          : {
              palette: { rose: { colors: { primary: "#333333" } } },
              theme: { dark: { colors: { primary: "#222222" } } },
            },
    });

  const renderAndReadSgPrimary = async (
    page: Page,
    compiledCss: string,
  ): Promise<string | null> => {
    await page.setContent(`<!DOCTYPE html>
<html data-theme="dark" data-palette="rose">
  <head>
    <style>${compiledCss}</style>
  </head>
  <body></body>
</html>`);

    return page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--sg-color-primary")
        .trim(),
    );
  };

  test("palette declared after theme wins (theme-first order)", async ({
    page,
  }) => {
    const theme = buildSyntheticTheme("theme-first");
    const { css } = generate(theme);
    const compiledCss = await compileFixtureCss(css, []);

    const value = await renderAndReadSgPrimary(page, compiledCss);
    expect(value).toBe("#333333");
  });

  test("theme declared after palette wins (palette-first order)", async ({
    page,
  }) => {
    const theme = buildSyntheticTheme("palette-first");
    const { css } = generate(theme);
    const compiledCss = await compileFixtureCss(css, []);

    const value = await renderAndReadSgPrimary(page, compiledCss);
    expect(value).toBe("#222222");
  });
});

/**
 * Cross-axis compound overrides (`[data-theme="dark"][data-palette="…"]`
 * in `examples/nuxt-v4/theme/palettes.css`) stay hand-written CSS —
 * outside the `themeAxes` scope (see the README's scope table) — but
 * their (0,2,0) specificity must still beat either single-axis
 * `html[data-...]` rule the library emits (0,1,1) when both attributes
 * are set together on `<html>`.
 */
test.describe("themeAxes precedence — hand-written compound override beats single-axis blocks", () => {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
  const themePath = join(
    repoRoot,
    "examples",
    "nuxt-v4",
    "theme",
    "theme.json",
  );
  const palettesCssPath = join(
    repoRoot,
    "examples",
    "nuxt-v4",
    "theme",
    "palettes.css",
  );

  test("dark×forest: --sg-color-primary matches the hand-written compound block (#7dba9e)", async ({
    page,
  }) => {
    const theme = ThemeSchema.parse(
      JSON.parse(readFileSync(themePath, "utf8")),
    );
    const palettesCss = readFileSync(palettesCssPath, "utf8");

    const { css } = generate(theme);
    const compiledCss = await compileFixtureCss(`${css}\n${palettesCss}`, []);

    await page.setContent(`<!DOCTYPE html>
<html data-theme="dark" data-palette="forest">
  <head>
    <style>${compiledCss}</style>
  </head>
  <body></body>
</html>`);

    const value = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue("--sg-color-primary")
        .trim(),
    );

    expect(value).toBe("#7dba9e");
  });
});
