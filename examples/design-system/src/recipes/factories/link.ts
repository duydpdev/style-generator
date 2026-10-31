import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export const linkTables = (t: RecipeTokens): RecipeTables => ({
  base: "",
  variants: {
    color: createVariantMapper("text", t.colors),
    underline: {
      always: "underline",
      hover: "no-underline hover:underline",
      none: "no-underline",
    },
  },
});

/** Link recipe for one theme: `color`, `underline`. */
export const createLinkRecipe = (t: RecipeTokens): RecipeFn =>
  recipeFromTables(linkTables(t));
