import { recipeFromTables, type RecipeFn, type RecipeTables } from "./tables";

/** Centred, full-width block; the width cap is the component's `maxWidth` prop (spacing has no `"auto"`). */
export const containerTables = (): RecipeTables => ({
  base: "mx-auto w-full",
  variants: {},
});

export const createContainerRecipe = (): RecipeFn =>
  recipeFromTables(containerTables());
