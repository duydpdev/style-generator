import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The intents `color` offers. `satisfies` fails when one leaves the theme. */
export const sliderIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type SliderIntent = (typeof sliderIntents)[number];

/** Literal classes keyed by the theme key they name: the generator emits no `accent-*` utility and no `focus-visible:`/`disabled:` variant of a theme key, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme. */
const stateClasses = {
  accent: {
    primary: "accent-primary",
    secondary: "accent-secondary",
    success: "accent-success",
    danger: "accent-danger",
  },
  focus: { focus: "focus-visible:outline-focus" },
  disabled: {
    disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
  },
} as const satisfies {
  accent: Record<SliderIntent, string>;
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** One `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  size: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};

const height = createVariantMapper("h-control", tokens.controlHeight);

/** A styled native `<input type="range">`: `color` sets the accent colour, `size` the height of the hit area (`h-control-*`). */
export const sliderTables = {
  base: [
    "block w-full",
    `cursor-pointer focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
    stateClasses.disabled.disabled,
  ],
  variants: {
    color: Object.fromEntries(
      sliderIntents.map((intent) => [intent, stateClasses.accent[intent]]),
    ),
    size: {
      sm: pick(height, themeKeys.size.sm),
      md: pick(height, themeKeys.size.md),
      lg: pick(height, themeKeys.size.lg),
    },
  },
  defaultVariants: { color: sliderIntents[0], size: "md" },
} satisfies RecipeTables;

/** `sliderRecipe({ color, size })` → class string. */
export const sliderRecipe = recipeFromTables(sliderTables);
