import {
  createDialogOverlayRecipe,
  createDialogRecipe,
  type DialogPreset,
  type RecipeTokens,
} from "design-system-example/recipes";

import type { DialogDeps } from "./Dialog.types";

export const createDialogStyles = (
  tokens: RecipeTokens,
  preset: DialogPreset,
): Pick<DialogDeps, "dialog" | "overlay"> => ({
  overlay: createDialogOverlayRecipe(tokens, preset),
  dialog: createDialogRecipe(tokens, preset),
});
