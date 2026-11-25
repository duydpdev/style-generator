import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

import { textFieldBase, type TextFieldPreset } from "./textarea";

/** The tokens the select reads: the recipe tokens plus the `controlHeight` keys. */
export interface SelectTokens extends RecipeTokens {
  readonly controlHeight: readonly string[];
}

/** Select roles: the text-field roles plus one `controlHeight` key per size. */
export interface SelectPreset extends TextFieldPreset {
  readonly height: Readonly<Record<"sm" | "md" | "lg", string>>;
}

/** A styled native `<select>`: `size` sets the height, padding and type style; the browser draws the arrow. */
export const selectTables = (t: SelectTokens, preset: SelectPreset) => {
  const type = createVariantMapper("", t.typography);
  const height = createVariantMapper("h-control", t.controlHeight);
  return {
    base: ["cursor-pointer", ...textFieldBase(t, preset)],
    variants: {
      size: {
        sm: [
          pick(height, preset.height.sm),
          "px-2",
          pick(type, preset.type.sm),
        ],
        md: [
          pick(height, preset.height.md),
          "px-2.5",
          pick(type, preset.type.md),
        ],
        lg: [
          pick(height, preset.height.lg),
          "px-3",
          pick(type, preset.type.lg),
        ],
      },
    },
    defaultVariants: { size: "md" },
  } satisfies RecipeTables;
};

export const createSelectRecipe = (t: SelectTokens, preset: SelectPreset) =>
  recipeFromTables(selectTables(t, preset));
