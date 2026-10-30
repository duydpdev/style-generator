import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import { createLinkRecipe } from "./factories/link";

/** Props of the bound link recipe. */
export type LinkRecipeProps = Readonly<{
  color?: ColorVariant<Theme> | null | undefined;
  underline?: "always" | "hover" | "none" | null | undefined;
}>;

/** Headless link recipe: `linkRecipe({ color, underline })`. */
export const linkRecipe: (props?: LinkRecipeProps) => string =
  createLinkRecipe(tokens);
