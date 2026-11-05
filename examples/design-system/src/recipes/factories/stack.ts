import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between";
/** `basis` values (Flex items): `0` is `basis-0`, a fraction is `basis-1/2`. */
export type FlexBasis =
  | 0
  | "auto"
  | "full"
  | "1/2"
  | "1/3"
  | "2/3"
  | "1/4"
  | "3/4";

/**
 * Flex layout of `Stack` (column): `direction`, `align`, `justify`, `wrap` and
 * `divideColor` (a color token or `token/step`); gap comes from spacing props.
 */
export const stackTables = (t: RecipeTokens): RecipeTables => ({
  base: "flex",
  variants: {
    direction: { column: "flex-col", row: "flex-row" },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: { true: "flex-wrap" },
    divideColor: createVariantMapper("divide", t.colors, {
      opacities: t.opacities ?? [],
    }),
  },
  defaultVariants: { direction: "column" },
});

export const createStackRecipe = (t: RecipeTokens): RecipeFn =>
  recipeFromTables(stackTables(t));

/**
 * `Flex` (row): the stack variants plus the item props `grow`, `shrink` and
 * `basis`. `Stack` does not take the item props.
 */
export const flexTables = (t: RecipeTokens): RecipeTables => {
  const s = stackTables(t);
  return {
    ...s,
    variants: {
      ...s.variants,
      grow: { true: "grow", false: "grow-0" },
      shrink: { true: "shrink", false: "shrink-0" },
      basis: {
        0: "basis-0",
        auto: "basis-auto",
        full: "basis-full",
        "1/2": "basis-1/2",
        "1/3": "basis-1/3",
        "2/3": "basis-2/3",
        "1/4": "basis-1/4",
        "3/4": "basis-3/4",
      } satisfies Record<FlexBasis, string>,
    },
    defaultVariants: { direction: "row" },
  };
};

export const createFlexRecipe = (t: RecipeTokens): RecipeFn =>
  recipeFromTables(flexTables(t));
