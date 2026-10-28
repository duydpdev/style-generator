import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect } from "vitest";

import { generate } from "../core/generate";
import { ThemeSchema } from "../core/themeSchema";

import { compileFixtureCss } from "./compileFixtureCss";

const repoRoot = join(__dirname, "..", "..");

/**
 * `examples/design-system/src/theme.json` declares two `themeAxes` — `theme`
 * (before `palette` in the file) — each with one or more variants. This
 * asserts the ported real-world theme, not a synthetic fixture, so a
 * regression in axis/variant declaration-order handling shows up against
 * the actual example consumers ship.
 */
describe("integration: themeAxes — multiple simultaneous axes (ported design-system theme)", () => {
  const themePath = join(
    repoRoot,
    "examples",
    "design-system",
    "src",
    "theme.json",
  );
  const theme = ThemeSchema.parse(JSON.parse(readFileSync(themePath, "utf8")));

  it('generate().css compiles to html[data-theme="dark"] and 3 html[data-palette=...] blocks after :root, in file declaration order', async () => {
    const { css } = generate(theme);
    const compiled = await compileFixtureCss(css, []);

    const rootIndex = compiled.indexOf(":root");
    const themeIndex = compiled.indexOf('html[data-theme="dark"]');
    const forestIndex = compiled.indexOf('html[data-palette="forest"]');
    const sunsetIndex = compiled.indexOf('html[data-palette="sunset"]');
    const monoIndex = compiled.indexOf('html[data-palette="mono"]');

    // Every block is present.
    expect(rootIndex).toBeGreaterThanOrEqual(0);
    expect(themeIndex).toBeGreaterThan(-1);
    expect(forestIndex).toBeGreaterThan(-1);
    expect(sunsetIndex).toBeGreaterThan(-1);
    expect(monoIndex).toBeGreaterThan(-1);

    // `theme.json` declares `themeAxes.theme` before `themeAxes.palette`,
    // and `forest`/`sunset`/`mono` in that order within `palette` — the
    // compiled output must preserve both orderings, all after `:root`.
    expect(themeIndex).toBeGreaterThan(rootIndex);
    expect(forestIndex).toBeGreaterThan(themeIndex);
    expect(sunsetIndex).toBeGreaterThan(forestIndex);
    expect(monoIndex).toBeGreaterThan(sunsetIndex);
  });

  it("axis override colors match theme.json's themeAxes values", async () => {
    const { css } = generate(theme);
    const compiled = await compileFixtureCss(css, []);

    expect(compiled).toMatch(/--sg-color-primary:\s*#8FA6FF/i); // themeAxes.theme.dark
    expect(compiled).toMatch(/--sg-color-primary:\s*#2f5f47/i); // themeAxes.palette.forest
    expect(compiled).toMatch(/--sg-color-primary:\s*#b23a1b/i); // themeAxes.palette.sunset
    expect(compiled).toMatch(/--sg-color-primary:\s*#0a0a0a/i); // themeAxes.palette.mono
  });
});
