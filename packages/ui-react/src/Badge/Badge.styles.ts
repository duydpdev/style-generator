import {
  createBadgeRecipe,
  type BadgePreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { BadgeDeps } from "./Badge.types";

export const createBadgeStyles = (
  tokens: RecipeTokens,
  preset: BadgePreset,
): Pick<BadgeDeps, "badge"> => ({ badge: createBadgeRecipe(tokens, preset) });
