import { createVariantMapper } from "@duydpdev/style-generator/cva";

import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "./tables";

/** `base`: classes every Box gets (design-system: `"relative"`); omitted → none. */
export interface BoxPreset {
  readonly base?: string | undefined;
}

/** Layout style props that are box-recipe variants; ui-react splits props with this list. */
export const BOX_VARIANT_KEYS = [
  "backgroundColor",
  "borderColor",
  "border",
  "borderX",
  "borderY",
  "borderT",
  "borderB",
  "borderL",
  "borderR",
  "rounded",
  "roundedT",
  "roundedB",
  "roundedL",
  "roundedR",
  "shadow",
  "backdropBlur",
  "position",
] as const;

export type BoxVariantKey = (typeof BOX_VARIANT_KEYS)[number];

/** Box as data: token variants, `innerBorder`, and the inner-border `overlay` element. */
export const boxTables = (
  t: RecipeTokens,
  preset?: BoxPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    backgroundColor: createVariantMapper("bg", t.colors),
    borderColor: createVariantMapper("border", t.colors),
    border: createVariantMapper("border", t.borderWidth),
    borderX: createVariantMapper("border-x", t.borderWidth),
    borderY: createVariantMapper("border-y", t.borderWidth),
    borderT: createVariantMapper("border-t", t.borderWidth),
    borderB: createVariantMapper("border-b", t.borderWidth),
    borderL: createVariantMapper("border-l", t.borderWidth),
    borderR: createVariantMapper("border-r", t.borderWidth),
    rounded: createVariantMapper("rounded", t.borderRadius),
    roundedT: createVariantMapper("rounded-t", t.borderRadius),
    roundedB: createVariantMapper("rounded-b", t.borderRadius),
    roundedL: createVariantMapper("rounded-l", t.borderRadius),
    roundedR: createVariantMapper("rounded-r", t.borderRadius),
    shadow: createVariantMapper("shadow", t.shadows),
    backdropBlur: createVariantMapper("backdrop-blur", t.backDropBlurs),
    position: {
      absolute: "absolute",
      relative: "relative",
      fixed: "fixed",
      sticky: "sticky",
    },
    innerBorder: { true: "!border-none" },
    // The inner-border element a Box renders (was a literal in react-v4's Box.tsx:94).
    overlay: { true: "pointer-events-none absolute inset-0" },
  },
});

/** Box recipe for one theme; spacing is not a variant (`splitSpacingProps`). */
export const createBoxRecipe = (
  t: RecipeTokens,
  preset?: BoxPreset,
): RecipeFn => recipeFromTables(boxTables(t, preset));
