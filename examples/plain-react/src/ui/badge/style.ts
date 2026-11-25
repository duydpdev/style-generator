import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  contrastText,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** Badge intents; renaming one in theme.json fails here. Each needs `<intent>Subtle` and `<intent>SubtleForeground` for `soft`. */
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

/** `soft` is `<intent>Subtle` with `<intent>SubtleForeground` text; indexing the mappers fails the compiler when the theme lacks one. */
const soft = (intent: BadgeIntent): string[] => [
  bg[`${intent}Subtle` as const],
  text[`${intent}SubtleForeground` as const],
];

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
      outline: bg.background,
    },
  },
  compoundVariants: badgeIntents.flatMap((intent) => [
    { color: intent, variant: "soft", class: soft(intent) },
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
export const badgeRecipe = recipeFromTables(badgeTables);
