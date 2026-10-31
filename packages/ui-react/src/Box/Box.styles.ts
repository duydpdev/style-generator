import {
  createBoxRecipe,
  type BoxPreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { BodyRecipe } from "../shared/splitStyleProps";

export const createBoxStyles = (
  tokens: RecipeTokens,
  preset: BoxPreset | undefined,
): { readonly box: BodyRecipe; readonly layout: BodyRecipe } => ({
  box: createBoxRecipe(tokens, preset),
  layout: createBoxRecipe(tokens),
});
