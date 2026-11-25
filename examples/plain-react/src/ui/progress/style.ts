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
export const progressIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type ProgressIntent = (typeof progressIntents)[number];

/** The theme keys the bar reads: the track fill, the radius of both parts and the indicator's motion. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  track: "border",
  radius: "pill",
  duration: "slow",
  easing: "standard",
} as const satisfies {
  track: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
};

const bg = createVariantMapper("bg", tokens.colors);
const rounded = pick(
  createVariantMapper("rounded", tokens.borderRadius),
  themeKeys.radius,
);

/** A determinate bar: `slot` picks `track` or `indicator`; `color` fills the indicator, `size` sets the track height. */
export const progressTables = {
  base: "",
  variants: {
    slot: {
      track: [
        "block w-full overflow-hidden",
        pick(bg, themeKeys.track),
        rounded,
      ],
      indicator: [
        "block h-full transition-[width] motion-reduce:transition-none",
        rounded,
        pick(
          createVariantMapper("duration", tokens.motionDuration),
          themeKeys.duration,
        ),
        pick(
          createVariantMapper("ease", tokens.motionEasing),
          themeKeys.easing,
        ),
      ],
    },
    color: Object.fromEntries(progressIntents.map((intent) => [intent, ""])),
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: [
    ...progressIntents.map((intent) => ({
      slot: "indicator",
      color: intent,
      class: pick(bg, intent),
    })),
    { slot: "track", size: "sm", class: "h-1" },
    { slot: "track", size: "md", class: "h-2" },
    { slot: "track", size: "lg", class: "h-3" },
  ],
  defaultVariants: { slot: "track", color: progressIntents[0], size: "md" },
} satisfies RecipeTables;

/** `progressRecipe({ slot, color, size })` → class string. */
export const progressRecipe = recipeFromTables(progressTables);
