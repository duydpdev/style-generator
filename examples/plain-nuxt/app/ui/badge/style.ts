import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  contrastText,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** Badge intents; renaming one in theme.json fails here. */
export const badgeIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

type BadgeIntent = (typeof badgeIntents)[number];

const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const border = createVariantMapper("border", tokens.colors);

// Opacity-modified classes stay literal: Tailwind finds them by scanning this file.
const soft = {
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-success/10 text-success",
  danger: "bg-danger/10 text-danger",
} as const satisfies Record<BadgeIntent, string>;

export const badgeTables = {
  base: [
    "inline-flex items-center gap-1 whitespace-nowrap px-2 py-0.5",
    createVariantMapper("rounded", tokens.borderRadius).pill,
    createVariantMapper("border", tokens.borderWidth).thin,
    createVariantMapper("", tokens.typography).text12Mono,
  ],
  variants: {
    color: Object.fromEntries(badgeIntents.map((intent) => [intent, ""])),
    variant: {
      soft: "border-transparent",
      solid: "border-transparent",
      outline: "bg-transparent",
    },
  },
  compoundVariants: badgeIntents.flatMap((intent) => [
    { color: intent, variant: "soft", class: soft[intent] },
    {
      color: intent,
      variant: "solid",
      class: [bg[intent], contrastText(tokens.colors, intent, "background")],
    },
    {
      color: intent,
      variant: "outline",
      class: [border[intent], text[intent]],
    },
  ]),
  defaultVariants: { color: "primary", variant: "soft" },
} satisfies RecipeTables;

/** `badgeRecipe({ color, variant })` → class string. */
export const badgeRecipe: RecipeFn = recipeFromTables(badgeTables);
