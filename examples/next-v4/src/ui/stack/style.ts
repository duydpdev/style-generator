import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens } from "../../theme";

/** Layout props that are recipe variants (the Box variants); `splitLayout` routes them to `layoutRecipe`. */
export const LAYOUT_VARIANT_KEYS = [
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

/** Layout props that become inline `style` (`width`, `min-height`, …); `splitLayout` routes them. */
export const LAYOUT_SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

/** The Box token variants without `relative`, kept in this folder so it copies out alone. */
export const layoutTables = {
  base: "",
  variants: {
    backgroundColor: createVariantMapper("bg", tokens.colors),
    borderColor: createVariantMapper("border", tokens.colors),
    border: createVariantMapper("border", tokens.borderWidth),
    borderX: createVariantMapper("border-x", tokens.borderWidth),
    borderY: createVariantMapper("border-y", tokens.borderWidth),
    borderT: createVariantMapper("border-t", tokens.borderWidth),
    borderB: createVariantMapper("border-b", tokens.borderWidth),
    borderL: createVariantMapper("border-l", tokens.borderWidth),
    borderR: createVariantMapper("border-r", tokens.borderWidth),
    rounded: createVariantMapper("rounded", tokens.borderRadius),
    roundedT: createVariantMapper("rounded-t", tokens.borderRadius),
    roundedB: createVariantMapper("rounded-b", tokens.borderRadius),
    roundedL: createVariantMapper("rounded-l", tokens.borderRadius),
    roundedR: createVariantMapper("rounded-r", tokens.borderRadius),
    shadow: createVariantMapper("shadow", tokens.shadows),
    backdropBlur: createVariantMapper("backdrop-blur", tokens.backDropBlurs),
    position: {
      absolute: "absolute",
      relative: "relative",
      fixed: "fixed",
      sticky: "sticky",
    },
  },
} satisfies RecipeTables;

export const layoutRecipe: RecipeFn = recipeFromTables(layoutTables);

/** One column of items (`direction` defaults to `column`); the gap comes from spacing props. */
export const stackTables = {
  base: "flex",
  variants: {
    direction: { column: "flex-col", row: "flex-row" },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
    },
    wrap: { true: "flex-wrap" },
  },
  defaultVariants: { direction: "column" },
} satisfies RecipeTables;

export const stackRecipe: RecipeFn = recipeFromTables(stackTables);
