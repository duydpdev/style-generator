import {
  createTextRecipe,
  type RecipeTokens,
  type TextPreset,
} from "design-system-example/recipes";

import type { TextDeps } from "./Text.types";

export const createTextStyles = (
  tokens: RecipeTokens,
  preset: TextPreset | undefined,
): Pick<TextDeps, "defaults" | "text"> => ({
  text: createTextRecipe(tokens, preset),
  defaults: { type: preset?.defaultType, color: preset?.defaultColor },
});
