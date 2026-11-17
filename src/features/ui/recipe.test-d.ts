import { describe, expectTypeOf, it } from "vitest";

import { recipeFromTables } from "./recipe";
import type { RecipeFn, RecipeProps } from "./recipe";

const button = recipeFromTables({
  base: "inline-flex",
  variants: {
    size: { sm: "h-8", md: "h-10" },
    tone: { primary: "bg-primary", danger: "bg-danger" },
    iconOnly: { true: "aspect-square" },
    zIndex: { 0: "z-0", 10: "z-10" },
  },
  defaultVariants: { size: "md" },
});

describe("RecipeFn<T>", () => {
  it("takes the variant names of its tables, each with its option keys", () => {
    expectTypeOf<
      keyof NonNullable<Parameters<typeof button>[0]>
    >().toEqualTypeOf<"size" | "tone" | "iconOnly" | "zIndex">();
    expectTypeOf(button).returns.toBeString();
    button({ size: "sm", tone: "danger" });
    button({ iconOnly: true, zIndex: 10 });
    button();
    button({});
  });

  it("rejects a misspelled variant name and an unknown option", () => {
    // @ts-expect-error `sizee` is not a variant of these tables
    expectTypeOf(button({ sizee: "sm" })).toBeString();
    // @ts-expect-error `huge` is not a `size` option
    expectTypeOf(button({ size: "huge" })).toBeString();
    // @ts-expect-error `iconOnly` takes a boolean
    expectTypeOf(button({ iconOnly: "yes" })).toBeString();
  });

  // L-L7: a value must be an option the table declares
  it("rejects a boolean or a number on a string-keyed variant (L-L7)", () => {
    // @ts-expect-error `size` has string keys only
    expectTypeOf(button({ size: true })).toBeString();
    // @ts-expect-error `size` has string keys only
    expectTypeOf(button({ size: 3 })).toBeString();
    // @ts-expect-error `tone` has string keys only
    expectTypeOf(button({ tone: false })).toBeString();
  });

  it("takes a boolean for a true/false variant and either form of a numeric key (L-L7)", () => {
    button({ iconOnly: true });
    button({ iconOnly: false });
    button({ zIndex: 10 });
    button({ zIndex: "10" });
    button({ zIndex: 0 });
    // @ts-expect-error 3 is not a `zIndex` option
    expectTypeOf(button({ zIndex: 3 })).toBeString();
    // @ts-expect-error "3" is not a `zIndex` option
    expectTypeOf(button({ zIndex: "3" })).toBeString();
  });

  it("takes the number form of a numeric string key (L-L7)", () => {
    const spacing = recipeFromTables({
      base: "",
      variants: { gap: { "4": "gap-4", "8": "gap-8" } },
    });
    spacing({ gap: 4 });
    spacing({ gap: "8" });
    // @ts-expect-error 5 is not a `gap` option
    expectTypeOf(spacing({ gap: 5 })).toBeString();
  });

  // L7a: a numeric value is allowed only when `${N}` equals the key exactly
  it("keeps a key that does not round-trip string-only (L7a)", () => {
    const keys = recipeFromTables({
      base: "",
      variants: {
        pad: {
          "01": "p-01",
          ".5": "p-half",
          "1.0": "p-one",
          "0x10": "p-hex",
          "1e3": "p-exp",
        },
      },
    });
    keys({ pad: "01" });
    keys({ pad: ".5" });
    keys({ pad: "1.0" });
    keys({ pad: "0x10" });
    keys({ pad: "1e3" });
    // @ts-expect-error cva looks up "1", not "01"
    expectTypeOf(keys({ pad: 1 })).toBeString();
    // @ts-expect-error cva looks up "0.5", not ".5"
    expectTypeOf(keys({ pad: 0.5 })).toBeString();
    // @ts-expect-error cva looks up "1", not "1.0"
    expectTypeOf(keys({ pad: 1 })).toBeString();
    // @ts-expect-error cva looks up "16", not "0x10"
    expectTypeOf(keys({ pad: 16 })).toBeString();
    // @ts-expect-error cva looks up "1000", not "1e3"
    expectTypeOf(keys({ pad: 1000 })).toBeString();
  });

  it("takes the number form of a numeric string key that round-trips (L7a)", () => {
    const steps = recipeFromTables({
      base: "",
      variants: { step: { "10": "a", "0": "b", "-1": "c" } },
    });
    steps({ step: 10 });
    steps({ step: 0 });
    steps({ step: -1 });
    steps({ step: "-1" });
    // @ts-expect-error 1 is not a `step` option
    expectTypeOf(steps({ step: 1 })).toBeString();
  });

  // L7b: defaultVariants takes what the props take, numbers included
  it("takes a number in defaultVariants (L7b)", () => {
    const layered = recipeFromTables({
      base: "",
      variants: {
        z: { 0: "z-0", 10: "z-10" },
        size: { sm: "h-8", md: "h-10" },
      },
      defaultVariants: { z: 10, size: "md" },
    });
    expectTypeOf(layered).returns.toBeString();
    // a later prop error is no longer masked by the defaultVariants error
    // @ts-expect-error `huge` is not a `size` option
    expectTypeOf(layered({ size: "huge" })).toBeString();
  });

  it("accepts any widened value when the recipe is annotated RecipeFn (L-L7)", () => {
    const loose: RecipeFn = button;
    const call = (size: string, zIndex: number) =>
      loose({ size, iconOnly: true, zIndex, tone: null });
    expectTypeOf(call).returns.toBeString();
  });

  it("is assignable to the untyped RecipeFn that splitLayout accepts", () => {
    expectTypeOf(button).toExtend<RecipeFn>();
  });

  it("is open to any variant name when the tables are not literal", () => {
    expectTypeOf<RecipeFn>().toEqualTypeOf<(props?: RecipeProps) => string>();
  });
});
