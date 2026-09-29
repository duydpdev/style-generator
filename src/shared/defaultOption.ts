import type { SpacingPropertyMap } from "../core/Options";

/**
 * Default spacing properties → CSS property mapping.
 * Used by plugin to generate `.sp-*` utility classes with CSS custom properties.
 */
export const DEFAULT_SPACING_PROPERTIES = {
  p: { padding: "var(--sg-sp-p)" },
  px: {
    "padding-left": "var(--sg-sp-px)",
    "padding-right": "var(--sg-sp-px)",
  },
  py: {
    "padding-top": "var(--sg-sp-py)",
    "padding-bottom": "var(--sg-sp-py)",
  },
  pt: { "padding-top": "var(--sg-sp-pt)" },
  pb: { "padding-bottom": "var(--sg-sp-pb)" },
  pl: { "padding-left": "var(--sg-sp-pl)" },
  pr: { "padding-right": "var(--sg-sp-pr)" },
  m: { margin: "var(--sg-sp-m)" },
  mx: {
    "margin-left": "var(--sg-sp-mx)",
    "margin-right": "var(--sg-sp-mx)",
  },
  my: {
    "margin-top": "var(--sg-sp-my)",
    "margin-bottom": "var(--sg-sp-my)",
  },
  mt: { "margin-top": "var(--sg-sp-mt)" },
  mb: { "margin-bottom": "var(--sg-sp-mb)" },
  ml: { "margin-left": "var(--sg-sp-ml)" },
  mr: { "margin-right": "var(--sg-sp-mr)" },
  gap: { gap: "var(--sg-sp-gap)" },
  "gap-x": { "column-gap": "var(--sg-sp-gap-x)" },
  "gap-y": { "row-gap": "var(--sg-sp-gap-y)" },
  top: { top: "var(--sg-sp-top)" },
  right: { right: "var(--sg-sp-right)" },
  bottom: { bottom: "var(--sg-sp-bottom)" },
  left: { left: "var(--sg-sp-left)" },
} as const satisfies SpacingPropertyMap;

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

// ---- Type helpers for defaults (used in type inference) ----

/**
 * Literal union of every default spacing property key (e.g. `"p" | "px" |
 * ... | "left"`). The single spacing-key type used repo-wide — inferred
 * from `DEFAULT_SPACING_PROPERTIES` via `as const satisfies` so it stays a
 * literal union instead of widening to `string`.
 */
export type SpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;

export type DefaultRoundedValue = (typeof DEFAULT_ROUNDED_VALUES)[number];

export type DefaultBorderValue = (typeof DEFAULT_BORDER_VALUES)[number];
