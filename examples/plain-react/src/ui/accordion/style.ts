import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** A literal class keyed by the theme key it names: the generator emits no `focus-visible:` variant of a theme key, so Tailwind finds it by scanning this file. */
const stateClasses = {
  focus: { focus: "focus-visible:outline-focus" },
} as const satisfies {
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
};

/** The theme keys the sections read. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  border: "border",
  borderWidth: "thin",
  type: { title: "text16Medium", body: "text14Regular" },
  title: "foreground",
  body: "muted",
  icon: "sm",
  duration: "fast",
  easing: "standard",
} as const satisfies {
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  type: Record<"title" | "body", TextVariant<typeof theme>>;
  title: ColorVariant<typeof theme>;
  body: ColorVariant<typeof theme>;
  icon: keyof (typeof theme)["iconSize"];
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
};

const text = createVariantMapper("text", tokens.colors);
const type = createVariantMapper("", tokens.typography);

/** Native `<details>`/`<summary>` sections: `slot` picks the `root`, an `item` (`<details>`), its `trigger` (`<summary>`), the chevron `icon` or the `content`. */
export const accordionTables = {
  base: "",
  variants: {
    slot: {
      root: "flex flex-col",
      item: [
        "group",
        pick(
          createVariantMapper("border-b", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(createVariantMapper("border", tokens.colors), themeKeys.border),
      ],
      trigger: [
        "flex cursor-pointer list-none items-center justify-between gap-2 py-3 [&::-webkit-details-marker]:hidden",
        pick(type, themeKeys.type.title),
        pick(text, themeKeys.title),
        `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
      ],
      icon: [
        "shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none",
        pick(createVariantMapper("size-icon", tokens.iconSize), themeKeys.icon),
        pick(
          createVariantMapper("duration", tokens.motionDuration),
          themeKeys.duration,
        ),
        pick(
          createVariantMapper("ease", tokens.motionEasing),
          themeKeys.easing,
        ),
      ],
      content: [
        "pb-3",
        pick(type, themeKeys.type.body),
        pick(text, themeKeys.body),
      ],
    },
  },
  defaultVariants: { slot: "root" },
} satisfies RecipeTables;

/** `accordionRecipe({ slot })` → the class of the root, an item, its trigger, the chevron or the content. */
export const accordionRecipe = recipeFromTables(accordionTables);
