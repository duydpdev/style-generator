import type { VariantProps } from "class-variance-authority";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import {
  createButtonRecipe,
  type ButtonPreset,
  type ButtonTint,
} from "./factories/button";

// #region docs:intents
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
// #endregion docs:intents

/** Design-system button roles. `focusRing`, `disabled` and `hoverTint` are literal classes, so Tailwind's scanner sees them. */
export const buttonPreset = {
  intents,
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
  height: { sm: "sm", md: "md", lg: "lg" },
  focusRing: "focus-visible:outline-focus",
  disabled: "disabled:opacity-disabled",
  hoverTint: {
    primary: "hover:bg-primary-subtle",
    secondary: "hover:bg-secondary-subtle",
    success: "hover:bg-success-subtle",
    danger: "hover:bg-danger-subtle",
  },
} as const satisfies ButtonPreset;

/** Props of the bound button recipe. */
export type ButtonRecipeProps = Readonly<{
  variant?: "solid" | ButtonTint | null | undefined;
  color?: Intent | null | undefined;
  size?: "sm" | "md" | "lg" | "icon" | null | undefined;
  iconOnly?: boolean | null | undefined;
}>;

/**
 * Headless button recipe: `buttonRecipe({ variant, color, size })` → class
 * string. Framework components wrap it with their own markup.
 */
export const buttonRecipe: (props?: ButtonRecipeProps) => string =
  createButtonRecipe(tokens, buttonPreset);

export type ButtonVariants = VariantProps<typeof buttonRecipe>;
