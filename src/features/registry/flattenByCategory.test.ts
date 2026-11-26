import { describe, it, expect } from "vitest";

import { flattenByCategory } from "./flattenByCategory";
import {
  colorsCategory,
  shadowsCategory,
  backdropBlursCategory,
  borderRadiusCategory,
  typographyCategory,
} from "./builtInCategories";

describe("flattenByCategory", () => {
  it("flattens colors into --sg-color-<key> vars", () => {
    expect(flattenByCategory(colorsCategory, { primary: "#fff" })).toEqual({
      "--sg-color-primary": "#fff",
    });
  });

  it("converts camelCase keys to kebab-case", () => {
    expect(
      flattenByCategory(colorsCategory, { sidebarForeground: "#111827" }),
    ).toEqual({ "--sg-color-sidebar-foreground": "#111827" });
  });

  it("uses the category's own cssVarPrefix for shadows", () => {
    expect(
      flattenByCategory(shadowsCategory, { sm: "0 1px 2px #000" }),
    ).toEqual({
      "--sg-shadow-sm": "0 1px 2px #000",
    });
  });

  it("uses the category's own cssVarPrefix for backdropBlurs", () => {
    expect(flattenByCategory(backdropBlursCategory, { sm: "4px" })).toEqual({
      "--sg-backdrop-blur-sm": "4px",
    });
  });

  it("uses the category's own cssVarPrefix for borderRadius", () => {
    expect(flattenByCategory(borderRadiusCategory, { sm: "4px" })).toEqual({
      "--sg-radius-sm": "4px",
    });
  });

  it("returns {} for categories with no cssVarPrefix (typography)", () => {
    expect(flattenByCategory(typographyCategory, { h1: "12px" })).toEqual({});
  });

  it("returns {} when data is undefined", () => {
    expect(flattenByCategory(colorsCategory, undefined)).toEqual({});
  });

  it("resolves `$key/<n>` to a color-mix of the target variable", () => {
    expect(
      flattenByCategory(colorsCategory, {
        navy700: "#1f2a44",
        scrim: "$navy700/45",
        hairline: "$navy700/1",
        veil: "$navy700/100",
      }),
    ).toEqual({
      "--sg-color-navy-700": "#1f2a44",
      "--sg-color-scrim":
        "color-mix(in srgb, var(--sg-color-navy-700) 45%, transparent)",
      "--sg-color-hairline":
        "color-mix(in srgb, var(--sg-color-navy-700) 1%, transparent)",
      "--sg-color-veil":
        "color-mix(in srgb, var(--sg-color-navy-700) 100%, transparent)",
    });
  });

  it("keeps a plain `$key` alias as a var() reference", () => {
    expect(flattenByCategory(colorsCategory, { a: "#000", b: "$a" })).toEqual({
      "--sg-color-a": "#000",
      "--sg-color-b": "var(--sg-color-a)",
    });
  });
});
