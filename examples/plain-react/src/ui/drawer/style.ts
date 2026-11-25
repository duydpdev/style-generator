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

/** The theme keys the drawer reads: the scrim (a `<colour>/<step>` key and a blur), the panel's fill, border and shadow, the two stacking keys, the motion keys and the text of each slot. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  scrim: "background/80",
  blur: "sm",
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  shadow: "lg",
  overlayLayer: "overlay",
  modalLayer: "modal",
  duration: "slow",
  easing: "standard",
  type: { body: "text14Regular", title: "text16Medium" },
  text: "foreground",
  description: "muted",
} as const satisfies {
  scrim: `${ColorVariant<typeof theme>}/${(typeof tokens.opacities)[number]}`;
  blur: keyof (typeof theme)["backdropBlurs"];
  surface: ColorVariant<typeof theme>;
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
  shadow: keyof (typeof theme)["shadows"];
  overlayLayer: keyof (typeof theme)["zIndex"];
  modalLayer: keyof (typeof theme)["zIndex"];
  duration: keyof (typeof theme)["motionDuration"];
  easing: keyof (typeof theme)["motionEasing"];
  type: Record<"body" | "title", TextVariant<typeof theme>>;
  text: ColorVariant<typeof theme>;
  description: ColorVariant<typeof theme>;
};

const text = createVariantMapper("text", tokens.colors);
const type = createVariantMapper("", tokens.typography);
const z = createVariantMapper("z", tokens.zIndex);
const motion = [
  pick(
    createVariantMapper("duration", tokens.motionDuration),
    themeKeys.duration,
  ),
  pick(createVariantMapper("ease", tokens.motionEasing), themeKeys.easing),
];

/** A panel docked to one edge over a blurred scrim: `slot` picks `overlay`, `content`, `title` or `description`; `side` (`left`, `right`, `bottom`) docks the panel and sets the edge it slides in from. */
export const drawerTables = {
  base: "",
  variants: {
    slot: {
      overlay: [
        "fixed inset-0 transition-opacity starting:opacity-0 motion-reduce:transition-none",
        pick(
          createVariantMapper("bg", tokens.colors, {
            opacities: tokens.opacities,
          }),
          themeKeys.scrim,
        ),
        pick(
          createVariantMapper("backdrop-blur", tokens.backdropBlurs),
          themeKeys.blur,
        ),
        pick(z, themeKeys.overlayLayer),
        ...motion,
      ],
      content: [
        "fixed flex flex-col gap-2 overflow-y-auto p-6 transition-[translate] motion-reduce:transition-none",
        pick(createVariantMapper("bg", tokens.colors), themeKeys.surface),
        pick(createVariantMapper("border", tokens.colors), themeKeys.border),
        pick(
          createVariantMapper("border", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(createVariantMapper("shadow", tokens.shadows), themeKeys.shadow),
        pick(z, themeKeys.modalLayer),
        ...motion,
        pick(type, themeKeys.type.body),
        pick(text, themeKeys.text),
      ],
      title: [pick(type, themeKeys.type.title), pick(text, themeKeys.text)],
      description: pick(text, themeKeys.description),
    },
    side: { left: "", right: "", bottom: "" },
  },
  compoundVariants: [
    {
      slot: "content",
      side: "left",
      class:
        "inset-y-0 left-0 w-80 max-w-[calc(100%-2rem)] starting:-translate-x-full",
    },
    {
      slot: "content",
      side: "right",
      class:
        "inset-y-0 right-0 w-80 max-w-[calc(100%-2rem)] starting:translate-x-full",
    },
    {
      slot: "content",
      side: "bottom",
      class: "inset-x-0 bottom-0 max-h-[80vh] starting:translate-y-full",
    },
  ],
  defaultVariants: { slot: "content", side: "right" },
} satisfies RecipeTables;

/** `drawerRecipe({ slot, side })` → the class of one drawer part. */
export const drawerRecipe = recipeFromTables(drawerTables);
