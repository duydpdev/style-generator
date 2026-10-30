import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

/** Text defaults; every field omitted → `<Text>` emits no class of its own. */
export interface TextPreset {
  readonly base?: string | undefined;
  readonly defaultType?: string | undefined;
  readonly defaultColor?: string | undefined;
}

export const textTables = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    type: createVariantMapper("", t.typography),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", t.colors),
  },
});

/** Text recipe for one theme: `type`, `color`, `decoration`, `align`. */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
