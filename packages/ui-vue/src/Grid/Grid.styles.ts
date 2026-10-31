import {
  createGridRecipe,
  type RecipeFn,
  type RecipeTokens,
} from "design-system-example/recipes";

export const createGridStyles = (
  tokens: RecipeTokens,
): { readonly grid: RecipeFn } => ({ grid: createGridRecipe(tokens) });
