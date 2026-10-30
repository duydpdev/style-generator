import { createListRecipe } from "./factories/list";

/** Props of the bound list recipe. */
export type ListRecipeProps = Readonly<{
  marker?: "none" | "disc" | "decimal" | null | undefined;
  position?: "inside" | "outside" | null | undefined;
}>;

/** Headless list recipe: `listRecipe({ marker, position })`. */
export const listRecipe: (props?: ListRecipeProps) => string =
  createListRecipe();
