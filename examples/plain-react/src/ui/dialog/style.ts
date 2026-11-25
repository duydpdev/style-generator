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

/** The theme keys the dialog reads: the scrim (a `<colour>/<step>` key and a blur), the panel's fill, border, radius and shadow, the two stacking keys, the motion keys and the text of each slot. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  scrim: "background/80",
  blur: "sm",
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "lg",
  shadow: "lg",
  overlayLayer: "overlay",
  modalLayer: "modal",
  duration: "fast",
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
  radius: RoundedVariant<typeof theme>;
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

/** A centred modal panel over a blurred scrim: `slot` picks `overlay`, `content`, `title` or `description`; `size` sets the panel's maximum width. Both fade in through `@starting-style`. */
export const dialogTables = {
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
        "fixed top-1/2 left-1/2 flex max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-2 overflow-y-auto p-6 transition-[opacity,scale] starting:scale-95 starting:opacity-0 motion-reduce:transition-none",
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
        pick(z, themeKeys.modalLayer),
        ...motion,
        pick(type, themeKeys.type.body),
        pick(text, themeKeys.text),
      ],
      title: [pick(type, themeKeys.type.title), pick(text, themeKeys.text)],
      description: pick(text, themeKeys.description),
    },
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: [
    { slot: "content", size: "sm", class: "max-w-sm" },
    { slot: "content", size: "md", class: "max-w-lg" },
    { slot: "content", size: "lg", class: "max-w-2xl" },
  ],
  defaultVariants: { slot: "content", size: "md" },
} satisfies RecipeTables;

/** `dialogRecipe({ slot, size })` → the class of one dialog part. */
export const dialogRecipe = recipeFromTables(dialogTables);
