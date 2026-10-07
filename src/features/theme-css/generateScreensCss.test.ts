import { describe, it, expect } from "vitest";

import type { StyleGeneratorOptions } from "../../core/Options";
import { resolveOptions } from "../../core/resolveOptions";

import { generateScreensCss as generateResolved } from "./generateScreensCss";

const generateScreensCss = (options: StyleGeneratorOptions = {}): string =>
  generateResolved(resolveOptions(options));

describe("generateScreensCss", () => {
  it("merges options.screens overrides/additions on top of the defaults", () => {
    const css = generateScreensCss({
      screens: { md: "800px", "3xl": "1920px" },
    });
    expect(css).toMatch(/--breakpoint-md: 800px;/);
    expect(css).toMatch(/--breakpoint-3xl: 1920px;/);
    expect(css).toMatch(/--breakpoint-lg: 1024px;/);
  });

  it("is emitted regardless of enableResponsive (matches old theme.screens registration)", () => {
    expect(generateScreensCss({ enableResponsive: false })).toBe(
      generateScreensCss(),
    );
  });
});
