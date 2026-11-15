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

  it("is assignable to the untyped RecipeFn that splitLayout accepts", () => {
    expectTypeOf(button).toExtend<RecipeFn>();
  });

  it("is open to any variant name when the tables are not literal", () => {
    expectTypeOf<RecipeFn>().toEqualTypeOf<(props?: RecipeProps) => string>();
  });
});
