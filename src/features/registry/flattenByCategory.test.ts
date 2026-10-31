import { describe, it, expect } from "vitest";

import { flattenByCategory } from "./flattenByCategory";
import {
  colorsCategory,
  shadowsCategory,
  backDropBlursCategory,
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

  it("uses the category's own cssVarPrefix for backDropBlurs", () => {
    expect(flattenByCategory(backDropBlursCategory, { sm: "4px" })).toEqual({
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
});
