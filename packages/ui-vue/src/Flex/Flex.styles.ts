import {
  createStackRecipe,
  type RecipeFn,
} from "design-system-example/recipes";

export const createFlexStyles = (): { readonly stack: RecipeFn } => ({
  stack: createStackRecipe(),
});
