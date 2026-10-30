import type { VariantProps } from "class-variance-authority";

import { tokens } from "../tokens";

import { intents, type Intent } from "./button";
import { createBadgeRecipe, type BadgePreset } from "./factories/badge";

export const badgePreset = {
  intents,
  background: "background",
  radius: "pill",
  borderWidth: "thin",
  type: "text12Mono",
  // Opacity-modified classes stay literal: the registry's coverage has none.
  soft: {
    primary: "bg-primary/10 text-primary",
    secondary: "bg-secondary/10 text-secondary",
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
  },
} as const satisfies BadgePreset;

/** Props of the bound badge recipe. */
export type BadgeRecipeProps = Readonly<{
  color?: Intent | null | undefined;
  variant?: "soft" | "solid" | "outline" | null | undefined;
}>;

/** Headless badge recipe: `badgeRecipe({ color, variant })`. */
export const badgeRecipe: (props?: BadgeRecipeProps) => string =
  createBadgeRecipe(tokens, badgePreset);

export type BadgeVariants = VariantProps<typeof badgeRecipe>;
