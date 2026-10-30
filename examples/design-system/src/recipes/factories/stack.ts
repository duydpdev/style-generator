import { recipeFromTables, type RecipeFn, type RecipeTables } from "./tables";

export type FlexAlign = "start" | "center" | "end" | "stretch";
export type FlexJustify = "start" | "center" | "end" | "between";

/** Flex layout shared by `Flex` (row) and `Stack` (column); gap comes from spacing props. */
export const stackTables = (): RecipeTables => ({
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
  },
  defaultVariants: { direction: "column" },
});

export const createStackRecipe = (): RecipeFn =>
  recipeFromTables(stackTables());
