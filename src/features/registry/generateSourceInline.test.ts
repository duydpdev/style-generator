import { describe, it, expect } from "vitest";

import { generateSourceInline } from "./generateSourceInline";

describe("generateSourceInline", () => {
  it("emits the sp-* brace-expansion line by default", () => {
    const css = generateSourceInline();
    expect(css).toMatch(/^@source inline\("sp-\{.*\}"\);\n$/);
  });

  it("omits the sp-* line when spacing is disabled", () => {
    const css = generateSourceInline({ spacing: { enabled: false } });
    expect(css).not.toMatch(/sp-\{/);
  });

  it("appends one @source inline(...) line per extraSources entry after sp-*", () => {
    const css = generateSourceInline({
      extraSources: ["hover:bg-primary", "md:flex"],
    });
    const lines = css.trim().split("\n");
    expect(lines[0]).toMatch(/^@source inline\("sp-\{.*\}"\);$/);
    expect(lines[1]).toBe('@source inline("hover:bg-primary");');
    expect(lines[2]).toBe('@source inline("md:flex");');
  });

  it("still emits extraSources lines when spacing is disabled", () => {
    const css = generateSourceInline({
      spacing: { enabled: false },
      extraSources: ["hover:bg-primary"],
    });
    expect(css).toBe('@source inline("hover:bg-primary");\n');
  });

  it("returns an empty string when there is nothing to emit", () => {
    const css = generateSourceInline({ spacing: { enabled: false } });
    expect(css).toBe("");
  });
});
