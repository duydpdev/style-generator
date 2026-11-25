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

/** The theme keys the toast reads: the panel's fill, border, radius, shadow and motion, and the text of each slot. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "lg",
  shadow: "md",
  duration: "fast",
  easing: "standard",
  type: { body: "text14Regular", title: "text16Medium" },
  title: "foreground",
  description: "muted",
} as const satisfies {
  surface: ColorVariant<typeof theme>;
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  radius: RoundedVariant<typeof theme>;
  shadow: keyof (typeof theme)["shadows"];
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
  type: Record<"body" | "title", TextVariant<typeof theme>>;
  title: ColorVariant<typeof theme>;
  description: ColorVariant<typeof theme>;
};

const text = createVariantMapper("text", tokens.colors);
const type = createVariantMapper("", tokens.typography);

/** A static notification panel: `slot` picks `root`, `title` or `description`. It enters from below through `@starting-style`; the app positions it. */
export const toastTables = {
  base: "",
  variants: {
    slot: {
      root: [
        "flex w-full max-w-sm flex-col gap-1 p-4 transition-[opacity,translate] starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
        pick(createVariantMapper("bg", tokens.colors), themeKeys.surface),
        pick(createVariantMapper("border", tokens.colors), themeKeys.border),
        pick(
          createVariantMapper("border", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.radius,
        ),
        pick(createVariantMapper("shadow", tokens.shadows), themeKeys.shadow),
        pick(
          createVariantMapper("duration", tokens.motionDuration),
          themeKeys.duration,
        ),
        pick(
          createVariantMapper("ease", tokens.motionEasing),
          themeKeys.easing,
        ),
        pick(type, themeKeys.type.body),
      ],
      title: [pick(type, themeKeys.type.title), pick(text, themeKeys.title)],
      description: pick(text, themeKeys.description),
    },
  },
  defaultVariants: { slot: "root" },
} satisfies RecipeTables;

/** `toastRecipe({ slot })` → the class of `root`, `title` or `description`. */
export const toastRecipe = recipeFromTables(toastTables);
