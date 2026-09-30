import { describe, it, expect } from "vitest";

import { generateScreensCss } from "./generateScreensCss";

describe("generateScreensCss", () => {
  it("emits the library's default pixel-based breakpoint scale", () => {
    const css = generateScreensCss();
    expect(css).toBe(
      "@theme {\n" +
        "  --breakpoint-sm: 640px;\n" +
        "  --breakpoint-md: 768px;\n" +
        "  --breakpoint-lg: 1024px;\n" +
        "  --breakpoint-xl: 1280px;\n" +
        "  --breakpoint-2xl: 1536px;\n" +
        "}\n",
    );
  });

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
