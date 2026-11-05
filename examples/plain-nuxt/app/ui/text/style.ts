import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** Applied when `type`/`color` are omitted; rename the token in theme.json and these lines fail. */
const defaultType = "text16Medium" satisfies TextVariant<typeof theme>;
const defaultColor = "foreground" satisfies ColorVariant<typeof theme>;

/**
 * Text as data: `type` is a typography utility (`text-16-medium`), `color` a
 * `text-*` color or `token/step` (`primary/50`); `transform`, `italic`,
 * `truncate` (also `whitespace-nowrap`), `lineClamp` and `wrap` map to the
 * matching utilities.
 */
export const textTables = {
  base: "wrap-anywhere whitespace-pre-wrap",
  variants: {
    type: createVariantMapper("", tokens.typography),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", tokens.colors, {
      opacities: tokens.opacities,
    }),
    transform: {
      uppercase: "uppercase",
      lowercase: "lowercase",
      capitalize: "capitalize",
      normalCase: "normal-case",
    },
    italic: { true: "italic" },
    truncate: { true: "truncate whitespace-nowrap" },
    lineClamp: {
      1: "line-clamp-1",
      2: "line-clamp-2",
      3: "line-clamp-3",
      4: "line-clamp-4",
      5: "line-clamp-5",
      6: "line-clamp-6",
      none: "line-clamp-none",
    },
    wrap: {
      wrap: "text-wrap",
      nowrap: "text-nowrap",
      balance: "text-balance",
      pretty: "text-pretty",
    },
  },
  defaultVariants: { type: defaultType, color: defaultColor },
} satisfies RecipeTables;

export const textRecipe: RecipeFn = recipeFromTables(textTables);
