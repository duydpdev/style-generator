import { describe, it, expect } from "vitest";

import { defineCategory } from "./TokenCategoryDescriptor";
import { builtInCategories } from "./builtInCategories";

describe("defineCategory", () => {
  it("returns the same descriptor object (identity helper)", () => {
    const descriptor = { key: "custom", classPrefixes: ["x"] };
    expect(defineCategory(descriptor)).toBe(descriptor);
  });
});

describe("builtInCategories", () => {
  it("registers all 6 built-in categories", () => {
    expect(builtInCategories.map((c) => c.key)).toEqual([
      "colors",
      "typography",
      "shadows",
      "backDropBlurs",
      "borderRadius",
      "border",
    ]);
  });

  it("every category declares a non-empty classPrefixes list", () => {
    for (const category of builtInCategories) {
      expect(category.classPrefixes?.length).toBeGreaterThan(0);
    }
  });
});
