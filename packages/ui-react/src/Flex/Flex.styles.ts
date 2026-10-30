import { createStackRecipe } from "design-system-example/recipes";

import type { BodyRecipe } from "../shared/splitStyleProps";

export const createFlexStyles = (): { readonly stack: BodyRecipe } => ({
  stack: createStackRecipe(),
});
