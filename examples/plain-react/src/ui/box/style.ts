import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens } from "../../theme";

/** Box props that are recipe variants; `splitLayout` routes them to `boxRecipe`. */
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

/** Box props that become inline `style` (`width`, `min-height`, …); `splitLayout` routes them. */
export const BOX_SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

/** The variants the inner-border overlay copies from its Box. */
export const BOX_OVERLAY_KEYS = [
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
] as const;

/** Box as data: token variants, `innerBorder` and the overlay element. Every Box is `relative` (the overlay is positioned against it). */
export const boxTables = {
  base: "relative",
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
    innerBorder: { true: "!border-none" },
    overlay: { true: "pointer-events-none absolute inset-0" },
  },
} satisfies RecipeTables;

export const boxRecipe: RecipeFn = recipeFromTables(boxTables);
