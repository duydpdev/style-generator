import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Separator roles: the line's colour and its `borderWidth` key. */
export interface SeparatorPreset {
  readonly color: string;
  readonly width: string;
}

/** A rule between content: `orientation` picks a full-width top border or a full-height left border. */
export const separatorTables = (t: RecipeTokens, preset: SeparatorPreset) =>
  ({
    base: [
      "shrink-0",
      pick(createVariantMapper("border", t.colors), preset.color),
    ],
    variants: {
      orientation: {
        horizontal: [
          "w-full",
          pick(createVariantMapper("border-t", t.borderWidth), preset.width),
        ],
        vertical: [
          "self-stretch",
          pick(createVariantMapper("border-l", t.borderWidth), preset.width),
        ],
      },
    },
    defaultVariants: { orientation: "horizontal" },
  }) satisfies RecipeTables;

export const createSeparatorRecipe = (
  t: RecipeTokens,
  preset: SeparatorPreset,
) => recipeFromTables(separatorTables(t, preset));
