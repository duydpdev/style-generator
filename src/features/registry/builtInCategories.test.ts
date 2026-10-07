import { describe, it, expect } from "vitest";

import { ThemeOverrideSchema, ThemeSchema } from "../../core/themeSchema";

import { builtInCategories, cssVarCategories } from "./builtInCategories";
import { categoryTokenMeta } from "./categoryTokenMeta";

/**
 * Field names of the theme schema's top-level object (everything a token
 * category can live in).
 * @returns {string[]} `ThemeSchema` shape keys
 */
const themeFieldNames = (): string[] =>
  Object.keys(ThemeSchema.def.out.def.shape);

describe("builtInCategories", () => {
  it("registers all 7 built-in categories", () => {
    expect(builtInCategories.map((c) => c.key)).toEqual([
      "colors",
      "typography",
      "shadows",
      "backDropBlurs",
      "borderRadius",
      "fontFamily",
      "borderWidth",
    ]);
  });

  it("every category declares a non-empty classPrefixes list", () => {
    for (const category of builtInCategories) {
      expect(category.classPrefixes.length).toBeGreaterThan(0);
    }
  });

  it("a descriptor's defaultValues come from categoryTokenMeta, and only from it", () => {
    for (const category of builtInCategories) {
      const expected =
        category.key in categoryTokenMeta
          ? categoryTokenMeta[category.key as keyof typeof categoryTokenMeta]
              .defaultValues
          : undefined;
      const actual =
        "defaultValues" in category ? category.defaultValues : undefined;
      expect(actual).toBe(expected);
    }
  });

  it("colors declares hover/active states for sibling-token variant classes", () => {
    const colors = builtInCategories.find((c) => c.key === "colors");
    expect(colors && "states" in colors ? colors.states : undefined).toEqual([
      "hover",
      "active",
    ]);
  });

  it("only the bareClassName category has the empty class prefix", () => {
    for (const category of builtInCategories) {
      const prefixes: readonly string[] = category.classPrefixes;
      expect(prefixes.includes("")).toBe("bareClassName" in category);
    }
  });

  it("every descriptor key is a ThemeSchema field (schema <=> registry parity)", () => {
    const fields = themeFieldNames();
    for (const category of builtInCategories) {
      expect(fields).toContain(category.key);
    }
  });

  it("every CSS-var descriptor key is a ThemeOverrideSchema field and vice versa", () => {
    const overrideFields = Object.keys(ThemeOverrideSchema.shape).sort((a, b) =>
      a.localeCompare(b),
    );
    expect(
      cssVarCategories.map((c) => c.key).sort((a, b) => a.localeCompare(b)),
    ).toEqual(overrideFields);
  });

  it("token and key alias names are unique across descriptors", () => {
    const tokenNames = builtInCategories.map((c) => c.tokenName);
    const tokenKeyNames = builtInCategories.map((c) => c.tokenKeyName);
    expect(new Set(tokenNames).size).toBe(tokenNames.length);
    expect(new Set(tokenKeyNames).size).toBe(tokenKeyNames.length);
  });
});
