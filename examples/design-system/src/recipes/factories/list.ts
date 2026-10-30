import { recipeFromTables, type RecipeFn, type RecipeTables } from "./tables";

export const listTables = (): RecipeTables => ({
  base: "",
  variants: {
    marker: { none: "list-none", disc: "list-disc", decimal: "list-decimal" },
    position: { inside: "list-inside", outside: "list-outside" },
  },
});

/** List recipe: `marker`, `position`; it needs no theme. */
export const createListRecipe = (): RecipeFn => recipeFromTables(listTables());
