import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

/** Code defaults; every field omitted → `<Code>` emits no class of its own. */
export interface CodePreset {
  readonly base?: string | undefined;
  readonly defaultType?: string | undefined;
}

export const codeTables = (
  t: RecipeTokens,
  preset?: CodePreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    type: createVariantMapper("", t.typography),
    color: createVariantMapper("text", t.colors),
  },
});

/** Code recipe for one theme: `type`, `color`. */
export const createCodeRecipe = (
  t: RecipeTokens,
  preset?: CodePreset,
): RecipeFn => recipeFromTables(codeTables(t, preset));
