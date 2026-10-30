import {
  createInputRecipe,
  type InputPreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { InputDeps } from "./Input.types";

export const createInputStyles = (
  tokens: RecipeTokens,
  preset: InputPreset,
): Pick<InputDeps, "input"> => ({ input: createInputRecipe(tokens, preset) });
