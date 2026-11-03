import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens } from "../../theme";

type Tokens = typeof tokens;

const bg = createVariantMapper("bg", tokens.colors);
const borderColor = createVariantMapper("border", tokens.colors);

/** Token defaults; renaming one of these keys in theme.json fails here. */
const cardDefaults = {
  radius: "lg",
  shadow: "sm",
  border: "thin",
} as const satisfies {
  readonly radius: Tokens["borderRadius"][number];
  readonly shadow: Tokens["shadows"][number];
  readonly border: Tokens["borderWidth"][number];
};

export const cardTables = {
  base: [
    "relative flex flex-col gap-3",
    createVariantMapper("text", tokens.colors).foreground,
  ],
  variants: {
    tone: {
      surface: [bg.surface, borderColor.line],
      muted: [bg.background, borderColor.line],
      outline: ["bg-transparent", borderColor.muted],
    },
    padding: { none: "p-0", sm: "p-3", md: "p-5", lg: "p-8" },
    radius: createVariantMapper("rounded", tokens.borderRadius),
    shadow: {
      ...createVariantMapper("shadow", tokens.shadows),
      none: "shadow-none",
    },
    border: {
      ...createVariantMapper("border", tokens.borderWidth),
      none: "border-none",
    },
  },
  defaultVariants: { tone: "surface", padding: "md", ...cardDefaults },
} satisfies RecipeTables;

/** `cardRecipe({ tone, padding, radius, shadow, border })` → class string. */
export const cardRecipe: RecipeFn = recipeFromTables(cardTables);
