import { createListRecipe, type RecipeFn } from "design-system-example/recipes";

export const createListStyles = (): { readonly list: RecipeFn } => ({
  list: createListRecipe(),
});
