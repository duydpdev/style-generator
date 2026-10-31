import {
  createBoxRecipe,
  type BoxPreset,
  type RecipeFn,
  type RecipeTokens,
} from "design-system-example/recipes";

export const createBoxStyles = (
  tokens: RecipeTokens,
  preset: BoxPreset | undefined,
): { readonly box: RecipeFn; readonly layout: RecipeFn } => ({
  box: createBoxRecipe(tokens, preset),
  layout: createBoxRecipe(tokens),
});
