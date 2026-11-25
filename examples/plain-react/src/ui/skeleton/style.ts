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

/** The theme keys the placeholder reads: its fill and radius. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  fill: "border",
  radius: "md",
} as const satisfies {
  fill: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
};

/** A pulsing placeholder with no prop axis: the app sets its width and height. It stops pulsing under `prefers-reduced-motion`. */
export const skeletonTables = {
  base: [
    "block animate-pulse motion-reduce:animate-none",
    pick(createVariantMapper("bg", tokens.colors), themeKeys.fill),
    pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
  ],
  variants: {},
} satisfies RecipeTables;

/** `skeletonRecipe()` → class string. */
export const skeletonRecipe = recipeFromTables(skeletonTables);
