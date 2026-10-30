import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  borderWidthClass,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface CardPreset {
  readonly surface: string;
  readonly background: string;
  readonly foreground: string;
  readonly border: string;
  readonly radius: string;
  readonly borderWidth?: string | undefined;
  readonly shadow: string;
}

export const cardTables = (
  t: RecipeTokens,
  preset: CardPreset,
): RecipeTables => {
  const bg = createVariantMapper("bg", t.colors);
  const borderColor = createVariantMapper("border", t.colors);
  return {
    base: [
      "relative flex flex-col",
      pick(createVariantMapper("text", t.colors), preset.foreground),
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      borderWidthClass(t.borderWidth, preset.borderWidth),
    ],
    variants: {
      tone: {
        surface: [
          pick(bg, preset.surface),
          pick(borderColor, preset.border),
          pick(createVariantMapper("shadow", t.shadows), preset.shadow),
        ],
        muted: [pick(bg, preset.background), pick(borderColor, preset.border)],
        outline: ["bg-transparent", pick(borderColor, preset.foreground)],
      },
      padding: { none: "p-0", sm: "p-3", md: "p-5", lg: "p-8" },
    },
    defaultVariants: { tone: "surface", padding: "md" },
  };
};

export const createCardRecipe = (
  t: RecipeTokens,
  preset: CardPreset,
): RecipeFn => recipeFromTables(cardTables(t, preset));
