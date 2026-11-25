import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** The theme keys the rule reads: its colour and its `borderWidth` key. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  color: "border",
  width: "thin",
} as const satisfies {
  color: ColorVariant<typeof theme>;
  width: keyof (typeof theme)["borderWidth"];
};

/** A rule between content: `orientation` picks a full-width top border or a full-height left border. */
export const separatorTables = {
  base: [
    "shrink-0",
    pick(createVariantMapper("border", tokens.colors), themeKeys.color),
  ],
  variants: {
    orientation: {
      horizontal: [
        "w-full",
        pick(
          createVariantMapper("border-t", tokens.borderWidth),
          themeKeys.width,
        ),
      ],
      vertical: [
        "self-stretch",
        pick(
          createVariantMapper("border-l", tokens.borderWidth),
          themeKeys.width,
        ),
      ],
    },
  },
  defaultVariants: { orientation: "horizontal" },
} satisfies RecipeTables;

/** `separatorRecipe({ orientation })` → class string. */
export const separatorRecipe = recipeFromTables(separatorTables);
