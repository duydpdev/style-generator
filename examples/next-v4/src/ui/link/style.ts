import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/** Link tones; renaming one in theme.json fails here. */
export const linkTones = [
  "primary",
  "foreground",
  "muted",
] as const satisfies readonly ColorVariant<typeof theme>[];

// `text-primary hover:text-primary-hover active:text-primary-active` where the siblings exist.
const textStates = createVariantMapper("text", tokens.colors, {
  states: COLOR_STATES,
});

export const linkTables = {
  base: [
    "inline-flex items-center gap-1",
    createVariantMapper("rounded", tokens.borderRadius).sm,
    "underline-offset-4 transition-colors duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
  ],
  variants: {
    tone: Object.fromEntries(linkTones.map((tone) => [tone, textStates[tone]])),
    underline: {
      always: "underline",
      hover: "no-underline hover:underline",
      none: "no-underline",
    },
  },
  defaultVariants: { tone: "primary", underline: "hover" },
} satisfies RecipeTables;

/** `linkRecipe({ tone, underline })` → class string. */
export const linkRecipe: RecipeFn = recipeFromTables(linkTables);
