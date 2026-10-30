import type { VariantProps } from "class-variance-authority";
import type { BackdropBlurVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import {
  createDialogOverlayRecipe,
  createDialogRecipe,
  type DialogPreset,
} from "./factories/dialog";

export const dialogPreset = {
  surface: "surface",
  foreground: "foreground",
  border: "muted",
  radius: "lg",
  borderWidth: "thin",
  shadow: "lg",
  overlay: "bg-foreground/40",
  defaultBlur: "md",
} as const satisfies DialogPreset;

/** Props of the bound dialog recipes. */
export type DialogOverlayRecipeProps = Readonly<{
  blur?: "none" | BackdropBlurVariant<Theme> | null | undefined;
}>;
export type DialogRecipeProps = Readonly<{
  size?: "sm" | "md" | "lg" | null | undefined;
}>;

/** Headless dialog backdrop recipe: `dialogOverlayRecipe({ blur })`. */
export const dialogOverlayRecipe: (props?: DialogOverlayRecipeProps) => string =
  createDialogOverlayRecipe(tokens, dialogPreset);
/** Headless dialog panel recipe: `dialogRecipe({ size })`. */
export const dialogRecipe: (props?: DialogRecipeProps) => string =
  createDialogRecipe(tokens, dialogPreset);

export type DialogOverlayVariants = VariantProps<typeof dialogOverlayRecipe>;
export type DialogVariants = VariantProps<typeof dialogRecipe>;
