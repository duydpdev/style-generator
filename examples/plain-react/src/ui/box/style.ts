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
  "display",
  "overflow",
  "zIndex",
  "opacity",
  "cursor",
  "pointerEvents",
  "select",
  "transition",
  "aspect",
  "objectFit",
  "visibility",
  "ringColor",
  "outlineColor",
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
    backgroundColor: createVariantMapper("bg", tokens.colors, {
      opacities: tokens.opacities,
    }),
    borderColor: createVariantMapper("border", tokens.colors, {
      opacities: tokens.opacities,
    }),
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
    display: {
      block: "block",
      inlineBlock: "inline-block",
      inline: "inline",
      flex: "flex",
      inlineFlex: "inline-flex",
      grid: "grid",
      contents: "contents",
      hidden: "hidden",
    },
    overflow: {
      auto: "overflow-auto",
      hidden: "overflow-hidden",
      clip: "overflow-clip",
      visible: "overflow-visible",
      scroll: "overflow-scroll",
    },
    zIndex: {
      0: "z-0",
      10: "z-10",
      20: "z-20",
      30: "z-30",
      40: "z-40",
      50: "z-50",
      auto: "z-auto",
    },
    opacity: {
      0: "opacity-0",
      10: "opacity-10",
      20: "opacity-20",
      30: "opacity-30",
      40: "opacity-40",
      50: "opacity-50",
      60: "opacity-60",
      70: "opacity-70",
      80: "opacity-80",
      90: "opacity-90",
      100: "opacity-100",
    },
    cursor: {
      auto: "cursor-auto",
      default: "cursor-default",
      pointer: "cursor-pointer",
      notAllowed: "cursor-not-allowed",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      text: "cursor-text",
      move: "cursor-move",
    },
    pointerEvents: {
      none: "pointer-events-none",
      auto: "pointer-events-auto",
    },
    select: {
      none: "select-none",
      text: "select-text",
      all: "select-all",
      auto: "select-auto",
    },
    transition: {
      none: "transition-none",
      all: "transition-all",
      colors: "transition-colors",
      opacity: "transition-opacity",
      shadow: "transition-shadow",
      transform: "transition-transform",
    },
    aspect: {
      auto: "aspect-auto",
      square: "aspect-square",
      video: "aspect-video",
    },
    objectFit: {
      contain: "object-contain",
      cover: "object-cover",
      fill: "object-fill",
      none: "object-none",
      scaleDown: "object-scale-down",
    },
    visibility: {
      visible: "visible",
      invisible: "invisible",
      collapse: "collapse",
    },
    ringColor: createVariantMapper("ring", tokens.colors, {
      opacities: tokens.opacities,
    }),
    outlineColor: createVariantMapper("outline", tokens.colors, {
      opacities: tokens.opacities,
    }),
    innerBorder: { true: "!border-none" },
    overlay: { true: "pointer-events-none absolute inset-0" },
  },
} satisfies RecipeTables;

export const boxRecipe: RecipeFn = recipeFromTables(boxTables);
