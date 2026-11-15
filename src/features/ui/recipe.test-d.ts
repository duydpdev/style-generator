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
