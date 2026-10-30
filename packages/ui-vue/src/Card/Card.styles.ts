import {
  createCardRecipe,
  type CardPreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { CardDeps } from "./Card.types";

export const createCardStyles = (
  tokens: RecipeTokens,
  preset: CardPreset,
): Pick<CardDeps, "card"> => ({ card: createCardRecipe(tokens, preset) });
