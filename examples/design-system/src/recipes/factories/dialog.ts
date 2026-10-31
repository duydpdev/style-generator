import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  borderWidthClass,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface DialogPreset {
  readonly surface: string;
  readonly foreground: string;
  readonly border: string;
  readonly radius: string;
  readonly borderWidth?: string | undefined;
  readonly shadow: string;
  /** Literal backdrop colour, e.g. `"bg-foreground/40"`. */
  readonly overlay: string;
  /** `"none"` or a backDropBlurs key. */
  readonly defaultBlur: string;
}

/** Backdrop: one part of `Dialog`, no component of its own. */
export const dialogOverlayTables = (
  t: RecipeTokens,
  preset: DialogPreset,
): RecipeTables => ({
  base: [
    "fixed inset-0 z-50 flex items-center justify-center",
    preset.overlay,
    "p-4",
  ],
  variants: {
    blur: {
      none: "",
      ...createVariantMapper("backdrop-blur", t.backDropBlurs),
    },
  },
  defaultVariants: { blur: preset.defaultBlur },
});

export const dialogTables = (
  t: RecipeTokens,
  preset: DialogPreset,
): RecipeTables => ({
  base: [
    "relative flex w-full flex-col gap-4 p-6",
    pick(createVariantMapper("bg", t.colors), preset.surface),
    pick(createVariantMapper("text", t.colors), preset.foreground),
    pick(createVariantMapper("border", t.colors), preset.border),
    borderWidthClass(t.borderWidth, preset.borderWidth),
    pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
    pick(createVariantMapper("shadow", t.shadows), preset.shadow),
  ],
  variants: { size: { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" } },
  defaultVariants: { size: "md" },
});

export const createDialogOverlayRecipe = (
  t: RecipeTokens,
  preset: DialogPreset,
): RecipeFn => recipeFromTables(dialogOverlayTables(t, preset));

export const createDialogRecipe = (
  t: RecipeTokens,
  preset: DialogPreset,
): RecipeFn => recipeFromTables(dialogTables(t, preset));
