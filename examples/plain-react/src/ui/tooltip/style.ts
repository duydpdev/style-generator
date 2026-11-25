import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The theme keys the tooltip reads: an inverted fill and text, the radius, the stacking key, the motion keys and the type style. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  fill: "foreground",
  text: "background",
  radius: "sm",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  type: "text12Mono",
} as const satisfies {
  fill: ColorVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  layer: keyof (typeof theme)["zIndex"];
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
  type: TextVariant<typeof theme>;
};

/** A short label placed by the app; it fades in through `@starting-style`. */
export const tooltipTables = {
  base: [
    "max-w-xs px-2 py-1 transition-opacity starting:opacity-0 motion-reduce:transition-none",
    pick(createVariantMapper("bg", tokens.colors), themeKeys.fill),
    pick(createVariantMapper("text", tokens.colors), themeKeys.text),
    pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
    pick(createVariantMapper("z", tokens.zIndex), themeKeys.layer),
    pick(
      createVariantMapper("duration", tokens.motionDuration),
      themeKeys.duration,
    ),
    pick(createVariantMapper("ease", tokens.motionEasing), themeKeys.easing),
    pick(createVariantMapper("", tokens.typography), themeKeys.type),
  ],
  variants: {},
} satisfies RecipeTables;

/** `tooltipRecipe()` → the tooltip's class. */
export const tooltipRecipe = recipeFromTables(tooltipTables);
