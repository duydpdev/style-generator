import { createContainerRecipe } from "design-system-example/recipes";

import type { BodyRecipe } from "../shared/splitStyleProps";

export const createContainerStyles = (): {
  readonly container: BodyRecipe;
} => ({ container: createContainerRecipe() });
