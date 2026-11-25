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

/**
 * Literal classes keyed by the theme key they name: the generator emits no `hover:`,
 * `focus-visible:` or `disabled:` variant of a theme key, so Tailwind finds these by scanning
 * this file. `satisfies` fails when a key leaves the theme.
 */
const stateClasses = {
  highlight: {
    primarySubtle: "hover:bg-primary-subtle focus-visible:bg-primary-subtle",
  },
  disabled: {
    disabled: "disabled:cursor-not-allowed disabled:opacity-disabled",
  },
} as const satisfies {
  highlight: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The theme keys the menu reads: the panel's fill, border, radius and shadow, its stacking key and motion, and an item's radius, type and text. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "md",
  shadow: "md",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  itemRadius: "sm",
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
  itemRadius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
};

const border = createVariantMapper("border", tokens.colors);

/** A list of actions: `slot` picks `content`, `item` or `separator`. An item shows hover and keyboard focus with the same fill. */
export const menuTables = {
  base: "",
  variants: {
    slot: {
      content: [
        "flex min-w-48 flex-col p-1 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
        pick(createVariantMapper("bg", tokens.colors), themeKeys.surface),
        pick(border, themeKeys.border),
        pick(
          createVariantMapper("border", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.radius,
        ),
        pick(createVariantMapper("shadow", tokens.shadows), themeKeys.shadow),
        pick(createVariantMapper("z", tokens.zIndex), themeKeys.layer),
        pick(
          createVariantMapper("duration", tokens.motionDuration),
          themeKeys.duration,
        ),
        pick(
          createVariantMapper("ease", tokens.motionEasing),
          themeKeys.easing,
        ),
      ],
      item: [
        "flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-start outline-hidden transition-colors",
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.itemRadius,
        ),
        pick(createVariantMapper("", tokens.typography), themeKeys.type),
        pick(createVariantMapper("text", tokens.colors), themeKeys.text),
        stateClasses.highlight.primarySubtle,
        stateClasses.disabled.disabled,
      ],
      separator: [
        "-mx-1 my-1",
        pick(
          createVariantMapper("border-t", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(border, themeKeys.border),
      ],
    },
  },
  defaultVariants: { slot: "content" },
} satisfies RecipeTables;

/** `menuRecipe({ slot })` → the class of one menu part. */
export const menuRecipe = recipeFromTables(menuTables);
