import { describe, it, expect } from "vitest";
import { z } from "zod";

import { defineTheme } from "./defineTheme";
import type { ThemeConfig } from "./themeSchema";

describe("defineTheme", () => {
  it("returns a parsed value that is structurally equal to, but not the same reference as, the input", () => {
    const input = { colors: { primary: "#3B82F6" } };
    const result = defineTheme(input);
    expect(result).toEqual(input);
    expect(result).not.toBe(input);
  });

  it("throws a ZodError for a theme missing the required colors field", () => {
    expect(() => defineTheme({} as never)).toThrow(z.ZodError);
  });

  it("throws a ZodError for a CSS-injection-unsafe value, even though it's a valid TS string literal", () => {
    // `theme.colors.primary` is a plain `string` at compile time — the
    // `;}` sequence is only rejected by ThemeSchema's runtime refinement.
    expect(() => defineTheme({ colors: { primary: "red;}" } })).toThrow(
      z.ZodError,
    );
  });

  it("validates a JSON-sourced theme identically to a TS literal — both go through the same .parse()", () => {
    const jsonTheme = JSON.parse('{"colors":{},"colours":{}}') as ThemeConfig;
    const literalTheme = { colors: {}, colours: {} } as ThemeConfig;

    expect(() => defineTheme(jsonTheme)).toThrow(z.ZodError);
    expect(() => defineTheme(literalTheme)).toThrow(z.ZodError);
  });
});
