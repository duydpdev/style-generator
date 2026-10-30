import type { SpacingPropertyMap } from "../core/Options";

/**
 * Default spacing properties → CSS properties each utility sets.
 * `generateSpacingCss` turns each entry into an `@utility sp-<key>` block
 * whose declarations read `var(--sg-sp-<key>)`. Passing
 * `options.spacing.properties` REPLACES this map; spread it to extend.
 */
export const DEFAULT_SPACING_PROPERTIES = {
  p: ["padding"],
  px: ["padding-left", "padding-right"],
  py: ["padding-top", "padding-bottom"],
  pt: ["padding-top"],
  pb: ["padding-bottom"],
  pl: ["padding-left"],
  pr: ["padding-right"],
  m: ["margin"],
  mx: ["margin-left", "margin-right"],
  my: ["margin-top", "margin-bottom"],
  mt: ["margin-top"],
  mb: ["margin-bottom"],
  ml: ["margin-left"],
  mr: ["margin-right"],
  gap: ["gap"],
  "gap-x": ["column-gap"],
  "gap-y": ["row-gap"],
  top: ["top"],
  right: ["right"],
  bottom: ["bottom"],
  left: ["left"],
} as const satisfies SpacingPropertyMap;

/** Default border radius values, used when `theme.borderRadius` is omitted. */
export const DEFAULT_ROUNDED_VALUES = [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "full",
] as const;

/** Default border width values, used when `theme.borderWidth` is omitted. */
export const DEFAULT_BORDER_VALUES = [0, 1, 2, 4] as const;

/**
 * Breakpoint keys used when `options.breakpoints` is not set — the single
 * default shared by the `@source inline` responsive variants, the spacing
 * `@media` chains, and `DesignTokens.Web.breakpoints`. `md`/`lg` match the
 * only responsive variants the pre-v4 baseline emitted
 * (89 `md:` + 89 `lg:`
 * classes, no `sm:`/`xl:`/`2xl:`).
 */
export const DEFAULT_BREAKPOINTS = ["md", "lg"] as const;

// ---- Type helpers for defaults (used in type inference) ----

/**
 * Literal union of every default spacing property key (e.g. `"p" | "px" |
 * ... | "left"`). The single spacing-key type used repo-wide — inferred
 * from `DEFAULT_SPACING_PROPERTIES` via `as const satisfies` so it stays a
 * literal union instead of widening to `string`.
 */
export type SpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;

/** One of `DEFAULT_ROUNDED_VALUES`, the radius keys used when `theme.borderRadius` is omitted. */
export type DefaultRoundedValue = (typeof DEFAULT_ROUNDED_VALUES)[number];

/** One of `DEFAULT_BORDER_VALUES` (`0 | 1 | 2 | 4`), the widths used when `theme.borderWidth` is omitted. */
export type DefaultBorderValue = (typeof DEFAULT_BORDER_VALUES)[number];
