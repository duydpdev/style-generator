import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Text defaults; every field omitted → `<Text>` emits no class of its own. */
export interface TextPreset {
  readonly base?: string | undefined;
  readonly defaultType?: string | undefined;
  readonly defaultColor?: string | undefined;
}

export const textTables = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    type: createVariantMapper("", t.typography),
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
    color: createVariantMapper("text", t.colors, {
      opacities: t.opacities ?? [],
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
});

/**
 * Text recipe for one theme: `type`, `color` (a token or `token/step`),
 * `decoration`, `align`, `transform`, `italic`, `truncate` (also sets
 * `whitespace-nowrap`), `lineClamp` and `wrap`.
 */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
