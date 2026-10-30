import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  borderWidthClass,
  contrastText,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

export interface BadgePreset {
  readonly intents: readonly string[];
  /** Solid-variant text colour of an intent without an `on<Intent>` sibling. */
  readonly background: string;
  readonly radius: string;
  /** Omitted → Tailwind's `border` (1px). */
  readonly borderWidth?: string | undefined;
  readonly type: string;
  /** Literal soft-variant classes per intent (`bg-primary/10 text-primary`). */
  readonly soft: Readonly<Record<string, string>>;
}

export const badgeTables = (
  t: RecipeTokens,
  preset: BadgePreset,
): RecipeTables => {
  const bg = createVariantMapper("bg", t.colors);
  const text = createVariantMapper("text", t.colors);
  const border = createVariantMapper("border", t.colors);
  return {
    base: [
      "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5",
      pick(createVariantMapper("rounded", t.borderRadius), preset.radius),
      borderWidthClass(t.borderWidth, preset.borderWidth),
      pick(createVariantMapper("", t.typography), preset.type),
    ],
    variants: {
      color: Object.fromEntries(preset.intents.map((intent) => [intent, ""])),
      variant: {
        soft: "border-transparent",
        solid: "border-transparent",
        outline: "bg-transparent",
      },
    },
    compoundVariants: preset.intents.flatMap((intent) => [
      { color: intent, variant: "soft", class: pick(preset.soft, intent) },
      {
        color: intent,
        variant: "solid",
        class: [
          pick(bg, intent),
          contrastText(t.colors, intent, preset.background),
        ],
      },
      {
        color: intent,
        variant: "outline",
        class: `${pick(border, intent)} ${pick(text, intent)}`,
      },
    ]),
    defaultVariants: { color: preset.intents[0], variant: "soft" },
  };
};

export const createBadgeRecipe = (
  t: RecipeTokens,
  preset: BadgePreset,
): RecipeFn => recipeFromTables(badgeTables(t, preset));
