import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface SelectPreset {
  readonly surface: string;
  readonly radius: string;
  readonly invalidBorder: string;
  /** Literal border classes, e.g. `"border border-current/20"`. */
  readonly border: string;
}

export const selectTables = (
  t: RecipeTokens,
  preset: SelectPreset,
): RecipeTables => ({
  base: [
    pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
    preset.border,
    pick(createVariantMapper("bg", t.colors), preset.surface),
  ],
  variants: {
    size: { sm: "px-1.5 py-0.5", md: "px-2 py-1", lg: "px-3 py-1.5" },
    invalid: {
      true: pick(createVariantMapper("border", t.colors), preset.invalidBorder),
      false: "",
    },
  },
  defaultVariants: { size: "md", invalid: false },
});

export const createSelectRecipe = (
  t: RecipeTokens,
  preset: SelectPreset,
): RecipeFn => recipeFromTables(selectTables(t, preset));
