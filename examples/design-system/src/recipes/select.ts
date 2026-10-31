import type { VariantProps } from "class-variance-authority";

import { tokens } from "../tokens";

import { createSelectRecipe, type SelectPreset } from "./factories/select";

export const selectPreset = {
  surface: "surface",
  radius: "md",
  invalidBorder: "danger",
  border: "border border-current/20",
} as const satisfies SelectPreset;

/** Props of the bound select recipe. */
export type SelectRecipeProps = Readonly<{
  size?: "sm" | "md" | "lg" | null | undefined;
  invalid?: boolean | null | undefined;
}>;

/** Headless select recipe; the default output is the string nuxt-v4's ThemeSwitch.vue hand-wrote. */
export const selectRecipe: (props?: SelectRecipeProps) => string =
  createSelectRecipe(tokens, selectPreset);

export type SelectVariants = VariantProps<typeof selectRecipe>;
