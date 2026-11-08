import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** `base`: classes every Box gets (design-system: `"relative"`); omitted → none. */
export interface BoxPreset {
  readonly base?: string | undefined;
}

/** `display` values: the Tailwind class suffix in camelCase (`inlineFlex` → `inline-flex`). */
export type BoxDisplay =
  | "block"
  | "inlineBlock"
  | "inline"
  | "flex"
  | "inlineFlex"
  | "grid"
  | "contents"
  | "hidden";
/** `overflow` values (`overflow-<value>`). */
export type BoxOverflow = "auto" | "hidden" | "clip" | "visible" | "scroll";
/** `zIndex` steps (`z-<value>`); numbers, as the recipe indexes the table by value. */
export type BoxZIndex = 0 | 10 | 20 | 30 | 40 | 50 | "auto";
/** `opacity` steps (`opacity-<value>`, percent). */
export type BoxOpacity = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
/** `cursor` values (`notAllowed` → `cursor-not-allowed`). */
export type BoxCursor =
  | "auto"
  | "default"
  | "pointer"
  | "notAllowed"
  | "grab"
  | "grabbing"
  | "text"
  | "move";
/** `pointerEvents` values (`pointer-events-<value>`). */
export type BoxPointerEvents = "none" | "auto";
/** `select` values (`select-<value>`, CSS `user-select`). */
export type BoxSelect = "none" | "text" | "all" | "auto";
/** `transition` values (`transition-<value>`). */
export type BoxTransition =
  | "none"
  | "all"
  | "colors"
  | "opacity"
  | "shadow"
  | "transform";
/** `aspect` values (`aspect-<value>`). */
export type BoxAspect = "auto" | "square" | "video";
/** `objectFit` values (`scaleDown` → `object-scale-down`). */
export type BoxObjectFit = "contain" | "cover" | "fill" | "none" | "scaleDown";
/** `visibility` values (`visible`, `invisible`, `collapse`). */
export type BoxVisibility = "visible" | "invisible" | "collapse";

/** Layout style props that are box-recipe variants; the sample components split props with this list. */
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

export type BoxVariantKey = (typeof BOX_VARIANT_KEYS)[number];

/** Box as data: token variants, `innerBorder`, and the inner-border `overlay` element. */
export const boxTables = (
  t: RecipeTokens,
  preset?: BoxPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    backgroundColor: createVariantMapper("bg", t.colors, {
      opacities: t.opacities ?? [],
    }),
    borderColor: createVariantMapper("border", t.colors, {
      opacities: t.opacities ?? [],
    }),
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
    display: {
      block: "block",
      inlineBlock: "inline-block",
      inline: "inline",
      flex: "flex",
      inlineFlex: "inline-flex",
      grid: "grid",
      contents: "contents",
      hidden: "hidden",
    } satisfies Record<BoxDisplay, string>,
    overflow: {
      auto: "overflow-auto",
      hidden: "overflow-hidden",
      clip: "overflow-clip",
      visible: "overflow-visible",
      scroll: "overflow-scroll",
    } satisfies Record<BoxOverflow, string>,
    zIndex: {
      0: "z-0",
      10: "z-10",
      20: "z-20",
      30: "z-30",
      40: "z-40",
      50: "z-50",
      auto: "z-auto",
    } satisfies Record<BoxZIndex, string>,
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
    } satisfies Record<BoxOpacity, string>,
    cursor: {
      auto: "cursor-auto",
      default: "cursor-default",
      pointer: "cursor-pointer",
      notAllowed: "cursor-not-allowed",
      grab: "cursor-grab",
      grabbing: "cursor-grabbing",
      text: "cursor-text",
      move: "cursor-move",
    } satisfies Record<BoxCursor, string>,
    pointerEvents: {
      none: "pointer-events-none",
      auto: "pointer-events-auto",
    } satisfies Record<BoxPointerEvents, string>,
    select: {
      none: "select-none",
      text: "select-text",
      all: "select-all",
      auto: "select-auto",
    } satisfies Record<BoxSelect, string>,
    transition: {
      none: "transition-none",
      all: "transition-all",
      colors: "transition-colors",
      opacity: "transition-opacity",
      shadow: "transition-shadow",
      transform: "transition-transform",
    } satisfies Record<BoxTransition, string>,
    aspect: {
      auto: "aspect-auto",
      square: "aspect-square",
      video: "aspect-video",
    } satisfies Record<BoxAspect, string>,
    objectFit: {
      contain: "object-contain",
      cover: "object-cover",
      fill: "object-fill",
      none: "object-none",
      scaleDown: "object-scale-down",
    } satisfies Record<BoxObjectFit, string>,
    visibility: {
      visible: "visible",
      invisible: "invisible",
      collapse: "collapse",
    } satisfies Record<BoxVisibility, string>,
    ringColor: createVariantMapper("ring", t.colors, {
      opacities: t.opacities ?? [],
    }),
    outlineColor: createVariantMapper("outline", t.colors, {
      opacities: t.opacities ?? [],
    }),
    innerBorder: { true: "!border-none" },
    // The inner-border element a Box renders (was a literal in the harness's Box.tsx:94).
    overlay: { true: "pointer-events-none absolute inset-0" },
  },
});

/** Box recipe for one theme; spacing is not a variant (`splitSpacingProps`). */
export const createBoxRecipe = (
  t: RecipeTokens,
  preset?: BoxPreset,
): RecipeFn => recipeFromTables(boxTables(t, preset));
