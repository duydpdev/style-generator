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

// L7: cva looks an option up by `String(value)`, which is what the types model
describe("recipeFromTables numeric options (L7)", () => {
  const recipe = recipeFromTables({
    base: "",
    variants: {
      z: { "10": "z-10", "0": "z-0" },
      pad: { "01": "p-01", ".5": "p-half", "1.0": "p-one" },
    },
    defaultVariants: { z: 10 },
  });

  it("matches a number against the key that prints as the number (L7a)", () => {
    expect(recipe({ z: 0 })).toBe("z-0");
    expect(recipe({ z: "0" })).toBe("z-0");
  });

  it("applies a numeric defaultVariants entry (L7b)", () => {
    expect(recipe()).toBe("z-10");
  });

  it("finds no class for a number against a key that does not round-trip (L7a)", () => {
    // the types reject these numbers; the cast reaches the runtime lookup
    expect(recipe({ z: 0, pad: 1 } as never)).toBe("z-0");
    expect(recipe({ pad: 0.5 } as never)).toBe("z-10");
    expect(recipe({ pad: "01" })).toBe("z-10 p-01");
    expect(recipe({ pad: ".5" })).toBe("z-10 p-half");
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
  it("uses the <intent>Foreground sibling when the theme declares it", () => {
    expect(
      contrastText(
        ["primary", "primaryForeground", "white"],
        "primary",
        "white",
      ),
    ).toBe("text-primary-foreground");
  });

  it("prefers <intent>Foreground over the deprecated on<Intent>", () => {
    expect(
      contrastText(
        ["primary", "onPrimary", "primaryForeground", "white"],
        "primary",
        "white",
      ),
    ).toBe("text-primary-foreground");
  });

  it("still uses the deprecated on<Intent> sibling when it is the only one", () => {
    expect(
      contrastText(["primary", "onPrimary", "white"], "primary", "white"),
    ).toBe("text-on-primary");
  });

  it("falls back when neither sibling exists", () => {
    expect(contrastText(["secondary", "white"], "secondary", "white")).toBe(
      "text-white",
    );
  });
});
