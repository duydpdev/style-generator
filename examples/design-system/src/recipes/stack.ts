import type { VariantProps } from "class-variance-authority";

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
}>;

/**
 * Headless flex-stack recipe: `stackRecipe({ direction, align, justify, wrap })`.
 * The gap is not a variant: pass the responsive `gap` / `gapX` / `gapY` spacing
 * props through `splitSpacingProps`.
 */
export const stackRecipe: (props?: StackRecipeProps) => string =
  createStackRecipe();

export type StackVariants = VariantProps<typeof stackRecipe>;
