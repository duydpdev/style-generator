import type { SpacingPropertyMap } from "../core/Options";

/**
 * Default spacing properties → CSS property mapping.
 * Used by plugin to generate `.sp-*` utility classes with CSS custom properties.
 */
export const DEFAULT_SPACING_PROPERTIES: SpacingPropertyMap = {
  p: { padding: "var(--sp-p)" },
  px: {
    "padding-left": "var(--sp-px)",
    "padding-right": "var(--sp-px)",
  },
  py: {
    "padding-top": "var(--sp-py)",
    "padding-bottom": "var(--sp-py)",
  },
  pt: { "padding-top": "var(--sp-pt)" },
  pb: { "padding-bottom": "var(--sp-pb)" },
  pl: { "padding-left": "var(--sp-pl)" },
  pr: { "padding-right": "var(--sp-pr)" },
  m: { margin: "var(--sp-m)" },
  mx: {
    "margin-left": "var(--sp-mx)",
    "margin-right": "var(--sp-mx)",
  },
  my: {
    "margin-top": "var(--sp-my)",
    "margin-bottom": "var(--sp-my)",
  },
  mt: { "margin-top": "var(--sp-mt)" },
  mb: { "margin-bottom": "var(--sp-mb)" },
  ml: { "margin-left": "var(--sp-ml)" },
  mr: { "margin-right": "var(--sp-mr)" },
  gap: { gap: "var(--sp-gap)" },
  "gap-x": { "column-gap": "var(--sp-gap-x)" },
  "gap-y": { "row-gap": "var(--sp-gap-y)" },
  top: { top: "var(--sp-top)" },
  right: { right: "var(--sp-right)" },
  bottom: { bottom: "var(--sp-bottom)" },
  left: { left: "var(--sp-left)" },
};

/**
 * Default layout utility classes for safelist.
 * Needed for responsive patterns like `md:hidden`, `lg:flex`.
 */
export const DEFAULT_LAYOUT_CLASSES = [
  // Display
  "hidden",
  "block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "inline-block",
  "inline",
  // Flex direction & wrap
  "flex-row",
  "flex-col",
  "flex-col-reverse",
  "flex-row-reverse",
  "flex-wrap",
  "flex-nowrap",
  "flex-wrap-reverse",
  // Align items
  "items-start",
  "items-end",
  "items-center",
  "items-baseline",
  "items-stretch",
  // Justify content
  "justify-start",
  "justify-end",
  "justify-center",
  "justify-between",
  "justify-around",
  "justify-evenly",
  // Align self
  "self-auto",
  "self-start",
  "self-end",
  "self-center",
  "self-stretch",
  "self-baseline",
  // Align content
  "content-center",
  "content-start",
  "content-end",
  "content-between",
  "content-around",
  "content-evenly",
  // Text align
  "text-left",
  "text-center",
  "text-right",
  "text-justify",
  "text-start",
  "text-end",
] as const;

/** Default border radius values for safelist. */
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

/** Default border width values for safelist. */
export const DEFAULT_BORDER_VALUES = [0, 1, 2, 4] as const;

/** Default opacity values for safelist. */
export const DEFAULT_OPACITY_VALUES = [
  0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
  100,
] as const;

/** Default z-index values for safelist. */
export const DEFAULT_ZINDEX_VALUES = [0, 10, 20, 30, 40, 50, "auto"] as const;

// ---- Type helpers for defaults (used in type inference) ----

export type DefaultSpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;

export type DefaultRoundedValue = (typeof DEFAULT_ROUNDED_VALUES)[number];

export type DefaultBorderValue = (typeof DEFAULT_BORDER_VALUES)[number];
