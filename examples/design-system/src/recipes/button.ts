import type { VariantProps } from "class-variance-authority";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import {
  createButtonRecipe,
  type ButtonPreset,
  type ButtonTint,
} from "./factories/button";

/**
 * The semantic intents the components expose. `satisfies` is the DX anchor:
 * rename or remove one of these colors in `theme.json` and the compiler fails
 * here, on the exact line, instead of silently shipping a class that no
 * longer exists (an `Extract<…>` would silently drop it).
 */
export const intents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<Theme>[];

export type Intent = (typeof intents)[number];

/** Design-system button roles. */
export const buttonPreset = {
  intents,
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text32Bold",
  focusRing: {
    primary: "focus-visible:outline-primary",
    secondary: "focus-visible:outline-secondary",
    success: "focus-visible:outline-success",
    danger: "focus-visible:outline-danger",
  },
  tint: {
    primary: {
      outline: "border-primary text-primary hover:bg-primary/10",
      soft: "bg-primary/10 text-primary hover:bg-primary/15",
      ghost: "text-primary hover:bg-primary/10",
      link: "text-primary",
    },
    secondary: {
      outline: "border-secondary text-secondary hover:bg-secondary/10",
      soft: "bg-secondary/10 text-secondary hover:bg-secondary/15",
      ghost: "text-secondary hover:bg-secondary/10",
      link: "text-secondary",
    },
    success: {
      outline: "border-success text-success hover:bg-success/10",
      soft: "bg-success/10 text-success hover:bg-success/15",
      ghost: "text-success hover:bg-success/10",
      link: "text-success",
    },
    danger: {
      outline: "border-danger text-danger hover:bg-danger/10",
      soft: "bg-danger/10 text-danger hover:bg-danger/15",
      ghost: "text-danger hover:bg-danger/10",
      link: "text-danger",
    },
  },
} as const satisfies ButtonPreset;

/** Props of the bound button recipe. */
export type ButtonRecipeProps = Readonly<{
  variant?: "fill" | ButtonTint | null | undefined;
  color?: Intent | null | undefined;
  size?: "sm" | "md" | "lg" | null | undefined;
}>;

/**
 * Headless button recipe: `buttonRecipe({ variant, color, size })` → class
 * string. Framework components wrap it with their own markup.
 */
export const buttonRecipe: (props?: ButtonRecipeProps) => string =
  createButtonRecipe(tokens, buttonPreset);

export type ButtonVariants = VariantProps<typeof buttonRecipe>;
