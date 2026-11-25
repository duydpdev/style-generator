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

/** The theme keys the popover reads: the panel's fill, border, radius and shadow, its stacking key, the motion keys and its text. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "md",
  shadow: "md",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  type: "text14Regular",
  text: "foreground",
} as const satisfies {
  surface: ColorVariant<typeof theme>;
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  radius: RoundedVariant<typeof theme>;
  shadow: keyof (typeof theme)["shadows"];
  layer: keyof (typeof theme)["zIndex"];
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
  type: TextVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
};

/** A floating panel anchored by the app: it fades and scales in through `@starting-style`. */
export const popoverTables = {
  base: [
    "flex w-72 flex-col gap-2 p-4 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
    pick(createVariantMapper("bg", tokens.colors), themeKeys.surface),
    pick(createVariantMapper("border", tokens.colors), themeKeys.border),
    pick(
      createVariantMapper("border", tokens.borderWidth),
      themeKeys.borderWidth,
    ),
    pick(createVariantMapper("rounded", tokens.borderRadius), themeKeys.radius),
    pick(createVariantMapper("shadow", tokens.shadows), themeKeys.shadow),
    pick(createVariantMapper("z", tokens.zIndex), themeKeys.layer),
    pick(
      createVariantMapper("duration", tokens.motionDuration),
      themeKeys.duration,
    ),
    pick(createVariantMapper("ease", tokens.motionEasing), themeKeys.easing),
    pick(createVariantMapper("", tokens.typography), themeKeys.type),
    pick(createVariantMapper("text", tokens.colors), themeKeys.text),
  ],
  variants: {},
} satisfies RecipeTables;

/** `popoverRecipe()` → the popover panel's class. */
export const popoverRecipe = recipeFromTables(popoverTables);
