import {
  createSelectRecipe,
  type RecipeTokens,
  type SelectPreset,
} from "design-system-example/recipes";

import type { SelectDeps } from "./Select.types";

export const createSelectStyles = (
  tokens: RecipeTokens,
  preset: SelectPreset,
): Pick<SelectDeps, "select"> => ({
  select: createSelectRecipe(tokens, preset),
});
