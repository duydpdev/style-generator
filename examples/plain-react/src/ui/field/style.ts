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

/** The theme keys the field reads: one type style, label, hint and error colours. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  type: "text14Regular",
  label: "foreground",
  hint: "muted",
  error: "danger",
} as const satisfies {
  type: TextVariant<typeof theme>;
  label: ColorVariant<typeof theme>;
  hint: ColorVariant<typeof theme>;
  error: ColorVariant<typeof theme>;
};

const text = createVariantMapper("text", tokens.colors);
const type = pick(createVariantMapper("", tokens.typography), themeKeys.type);

/** A field has no prop axis: `slot` picks the class of one anatomy slot. */
export const fieldTables = {
  base: "",
  variants: {
    slot: {
      root: "flex flex-col gap-1.5",
      label: [type, pick(text, themeKeys.label)],
      hint: [type, pick(text, themeKeys.hint)],
      error: [type, pick(text, themeKeys.error)],
    },
  },
  defaultVariants: { slot: "root" },
} satisfies RecipeTables;

/** `fieldRecipe({ slot })` → the class of `root`, `label`, `hint` or `error`. */
export const fieldRecipe = recipeFromTables(fieldTables);
