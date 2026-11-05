import type { VariantProps } from "class-variance-authority";

import { tokens, type ColorValue } from "../tokens";

import {
  createStackRecipe,
  type FlexAlign,
  type FlexJustify,
} from "./factories/stack";

/** Props of the bound stack recipe. */
export type StackRecipeProps = Readonly<{
  direction?: "column" | "row" | null | undefined;
  align?: FlexAlign | null | undefined;
  justify?: FlexJustify | null | undefined;
  wrap?: boolean | null | undefined;
  divideColor?: ColorValue | null | undefined;
}>;

/**
 * Headless flex-stack recipe: `stackRecipe({ direction, align, justify, wrap, divideColor })`.
 * The gap is not a variant: pass the responsive `gap` / `gapX` / `gapY` spacing
 * props through `splitSpacingProps`.
 */
export const stackRecipe: (props?: StackRecipeProps) => string =
  createStackRecipe(tokens);

export type StackVariants = VariantProps<typeof stackRecipe>;
