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

/** The theme keys the table reads. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  type: { body: "text14Regular", header: "text12Mono" },
  text: "foreground",
  muted: "muted",
  border: "border",
  borderWidth: "thin",
} as const satisfies {
  type: Record<"body" | "header", TextVariant<typeof theme>>;
  text: ColorVariant<typeof theme>;
  muted: ColorVariant<typeof theme>;
  border: ColorVariant<typeof theme>;
  borderWidth: keyof (typeof theme)["borderWidth"];
};

const text = createVariantMapper("text", tokens.colors);
const type = createVariantMapper("", tokens.typography);
const cell = "px-3 py-2 align-middle";

/** A data table: `slot` picks the `root` (`<table>`), the `caption`, a `row`, a `header` or a `cell`; `align` sets a header's or cell's text alignment. */
export const tableTables = {
  base: "",
  variants: {
    slot: {
      root: [
        "w-full caption-bottom border-collapse",
        pick(type, themeKeys.type.body),
        pick(text, themeKeys.text),
      ],
      caption: ["mt-2", pick(text, themeKeys.muted)],
      row: [
        pick(
          createVariantMapper("border-b", tokens.borderWidth),
          themeKeys.borderWidth,
        ),
        pick(createVariantMapper("border", tokens.colors), themeKeys.border),
      ],
      header: [
        cell,
        pick(type, themeKeys.type.header),
        pick(text, themeKeys.muted),
      ],
      cell,
    },
    align: { start: "text-start", end: "text-end" },
  },
  defaultVariants: { slot: "root", align: "start" },
} satisfies RecipeTables;

/** `tableRecipe({ slot, align })` → class string. */
export const tableRecipe = recipeFromTables(tableTables);
