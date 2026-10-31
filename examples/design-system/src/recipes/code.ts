import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import { createCodeRecipe } from "./factories/code";

/** Props of the bound code recipe. */
export type CodeRecipeProps = Readonly<{
  type?: TextVariant<Theme> | null | undefined;
  color?: ColorVariant<Theme> | null | undefined;
}>;

/** Headless code recipe: `codeRecipe({ type, color })`; the design system declares no code preset. */
export const codeRecipe: (props?: CodeRecipeProps) => string =
  createCodeRecipe(tokens);
