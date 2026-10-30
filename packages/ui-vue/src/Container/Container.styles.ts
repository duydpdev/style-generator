import {
  createContainerRecipe,
  type RecipeFn,
} from "design-system-example/recipes";

export const createContainerStyles = (): {
  readonly container: RecipeFn;
} => ({ container: createContainerRecipe() });
