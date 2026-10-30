import {
  createButtonRecipe,
  type ButtonPreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { ButtonDeps } from "./Button.types";

export const createButtonStyles = (
  tokens: RecipeTokens,
  preset: ButtonPreset,
): Pick<ButtonDeps, "button"> => ({
  button: createButtonRecipe(tokens, preset),
});
