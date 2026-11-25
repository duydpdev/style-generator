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

/** The theme keys the avatar reads: the initials' fill and text, the radius, the type and one `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  fill: "secondarySubtle",
  text: "secondarySubtleForeground",
  radius: "pill",
  type: "text14Regular",
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  fill: ColorVariant<typeof theme>;
  text: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  size: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};

const height = createVariantMapper("h-control", tokens.controlHeight);

/** A square picture or initials: `slot` picks the `root` or the `image`; `size` sets the root's height (and, through `aspect-square`, its width). */
export const avatarTables = {
  base: "",
  variants: {
    slot: {
      root: [
        "inline-flex aspect-square shrink-0 items-center justify-center overflow-hidden select-none",
        pick(createVariantMapper("bg", tokens.colors), themeKeys.fill),
        pick(createVariantMapper("text", tokens.colors), themeKeys.text),
        pick(
          createVariantMapper("rounded", tokens.borderRadius),
          themeKeys.radius,
        ),
        pick(createVariantMapper("", tokens.typography), themeKeys.type),
      ],
      image: "size-full object-cover",
    },
    size: { sm: "", md: "", lg: "" },
  },
  compoundVariants: (["sm", "md", "lg"] as const).map((size) => ({
    slot: "root",
    size,
    class: pick(height, themeKeys.size[size]),
  })),
  defaultVariants: { slot: "root", size: "md" },
} satisfies RecipeTables;

/** `avatarRecipe({ slot, size })` → the class of the root or the image. */
export const avatarRecipe = recipeFromTables(avatarTables);
