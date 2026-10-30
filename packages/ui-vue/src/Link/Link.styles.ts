import {
  createLinkRecipe,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { LinkDeps } from "./Link.types";

export const createLinkStyles = (
  tokens: RecipeTokens,
): Pick<LinkDeps, "link"> => ({
  link: createLinkRecipe(tokens),
});
