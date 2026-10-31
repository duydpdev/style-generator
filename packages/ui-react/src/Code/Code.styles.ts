import {
  createCodeRecipe,
  type CodePreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { CodeDeps } from "./Code.types";

export const createCodeStyles = (
  tokens: RecipeTokens,
  preset: CodePreset | undefined,
): Pick<CodeDeps, "code" | "defaults"> => ({
  code: createCodeRecipe(tokens, preset),
  defaults: { type: preset?.defaultType },
});
