import { describe, expect, it } from "vitest";

import { contrastText, pick, recipeFromTables } from "./recipe";

describe("recipeFromTables", () => {
  const recipe = recipeFromTables({
    base: "inline-flex",
    variants: {
      size: { sm: "h-8", md: "h-10" },
      block: { true: "w-full", false: "" },
    },
    compoundVariants: [{ size: "sm", block: true, class: "px-2" }],
    defaultVariants: { size: "md" },
  });

  it("applies the base and the default variants when called without props", () => {
    expect(recipe()).toBe("inline-flex h-10");
  });

  it("applies the chosen options and the matching compound variant", () => {
    expect(recipe({ size: "sm", block: true })).toBe(
      "inline-flex h-8 w-full px-2",
    );
  });
});

describe("pick", () => {
  it("returns the class of a known token", () => {
    expect(pick({ primary: "bg-primary" }, "primary")).toBe("bg-primary");
  });

  it("throws an error naming a missing token", () => {
    expect(() => pick({ primary: "bg-primary" }, "danger")).toThrow(/"danger"/);
  });

  it("throws when the entry is not a string", () => {
    expect(() => pick({ primary: 1 }, "primary")).toThrow(/"primary"/);
  });
});

describe("contrastText", () => {
  it("uses the on<Intent> sibling when the theme declares it", () => {
    expect(
      contrastText(["primary", "onPrimary", "white"], "primary", "white"),
    ).toBe("text-on-primary");
  });

  it("falls back when the sibling is missing", () => {
    expect(contrastText(["secondary", "white"], "secondary", "white")).toBe(
      "text-white",
    );
  });
});
