import type { VariantProps } from "class-variance-authority";

import { tokens } from "../tokens";

import { createCardRecipe, type CardPreset } from "./factories/card";

export const cardPreset = {
  surface: "surface",
  background: "background",
  foreground: "foreground",
  border: "muted",
  radius: "lg",
  borderWidth: "thin",
  shadow: "sm",
} as const satisfies CardPreset;

/** Props of the bound card recipe. */
export type CardRecipeProps = Readonly<{
  tone?: "surface" | "muted" | "outline" | null | undefined;
  padding?: "none" | "sm" | "md" | "lg" | null | undefined;
}>;

/** Headless card recipe: `cardRecipe({ tone, padding })`. */
export const cardRecipe: (props?: CardRecipeProps) => string = createCardRecipe(
  tokens,
  cardPreset,
);

export type CardVariants = VariantProps<typeof cardRecipe>;
