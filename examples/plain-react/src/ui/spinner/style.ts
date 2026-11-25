import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The intents `color` offers. `satisfies` fails when one leaves the theme. */
export const spinnerIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type SpinnerIntent = (typeof spinnerIntents)[number];

/** The theme keys the ring reads: its width and radius, and one `iconSize` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  borderWidth: "thick",
  radius: "pill",
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  borderWidth: keyof (typeof theme)["borderWidth"];
  radius: RoundedVariant<typeof theme>;
  size: Record<"sm" | "md" | "lg", keyof (typeof theme)["iconSize"]>;
};

const text = createVariantMapper("text", tokens.colors);
const icon = createVariantMapper("size-icon", tokens.iconSize);

/** A spinning ring with one open side: `color` sets its colour, `size` its box (`size-icon-*`). It stops under `prefers-reduced-motion`. */
export const spinnerTables = {
  base: [
    "inline-block shrink-0 animate-spin border-solid border-current border-r-transparent motion-reduce:animate-none",
    pick(
      createVariantMapper("border", tokens.borderWidth),
      themeKeys.borderWidth,
    ),
    pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
  ],
  variants: {
    color: Object.fromEntries(
      spinnerIntents.map((intent) => [intent, pick(text, intent)]),
    ),
    size: {
      sm: pick(icon, themeKeys.size.sm),
      md: pick(icon, themeKeys.size.md),
      lg: pick(icon, themeKeys.size.lg),
    },
  },
  defaultVariants: { color: spinnerIntents[0], size: "md" },
} satisfies RecipeTables;

/** `spinnerRecipe({ color, size })` → class string. */
export const spinnerRecipe = recipeFromTables(spinnerTables);
