import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  borderWidthClass,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface InputPreset {
  readonly surface: string;
  readonly foreground: string;
  readonly border: string;
  readonly invalidBorder: string;
  readonly radius: string;
  readonly borderWidth?: string | undefined;
  readonly type: string;
  /** Literal, e.g. `"placeholder:text-muted"`. */
  readonly placeholder: string;
  /** Literal, e.g. `"focus-visible:border-primary"`. */
  readonly focus: string;
}

export const inputTables = (
  t: RecipeTokens,
  preset: InputPreset,
): RecipeTables => {
  const borderColor = createVariantMapper("border", t.colors);
  return {
    base: [
      "w-full outline-none transition-colors duration-150",
      preset.placeholder,
      preset.focus,
      "disabled:cursor-not-allowed disabled:opacity-50",
      pick(createVariantMapper("bg", t.colors), preset.surface),
      pick(createVariantMapper("text", t.colors), preset.foreground),
      borderWidthClass(t.borderWidth, preset.borderWidth),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      pick(createVariantMapper("", t.typography), preset.type),
    ],
    variants: {
      size: { sm: "h-8 px-2.5", md: "h-9 px-3", lg: "h-11 px-4" },
      invalid: {
        true: pick(borderColor, preset.invalidBorder),
        false: pick(borderColor, preset.border),
      },
    },
    defaultVariants: { size: "md", invalid: false },
  };
};

export const createInputRecipe = (
  t: RecipeTokens,
  preset: InputPreset,
): RecipeFn => recipeFromTables(inputTables(t, preset));
