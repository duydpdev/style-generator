import type { VariantProps } from "class-variance-authority";

import { tokens } from "../tokens";

import { createInputRecipe, type InputPreset } from "./factories/input";

export const inputPreset = {
  surface: "surface",
  foreground: "foreground",
  border: "muted",
  invalidBorder: "danger",
  radius: "md",
  borderWidth: "thin",
  type: "text14Regular",
  placeholder: "placeholder:text-muted",
  focus: "focus-visible:border-primary",
} as const satisfies InputPreset;

/** Props of the bound input recipe. */
export type InputRecipeProps = Readonly<{
  size?: "sm" | "md" | "lg" | null | undefined;
  invalid?: boolean | null | undefined;
}>;

/** Headless text-input recipe: `inputRecipe({ size, invalid })`. */
export const inputRecipe: (props?: InputRecipeProps) => string =
  createInputRecipe(tokens, inputPreset);

export type InputVariants = VariantProps<typeof inputRecipe>;
