import {
  createGridRecipe,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { BodyRecipe } from "../shared/splitStyleProps";

export const createGridStyles = (
  tokens: RecipeTokens,
): { readonly grid: BodyRecipe } => ({ grid: createGridRecipe(tokens) });
