import type { SpacingPropertyMap } from "../core/Options";

/** Default spacing key → CSS properties of its `@utility sp-<key>`. `options.spacing.properties` REPLACES this map; spread it to extend. */
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

// Rationale: documents/architecture.md#default_breakpoints-why-only-md-and-lg
/** Breakpoint keys used when `options.breakpoints` is not set. */
export const DEFAULT_BREAKPOINTS = ["md", "lg"] as const;

/** Literal union of the default spacing keys (`"p" | "px" | … | "left"`), the spacing-key type used repo-wide. */
export type SpacingKey = keyof typeof DEFAULT_SPACING_PROPERTIES;

/** One of `DEFAULT_ROUNDED_VALUES`, the radius keys used when `theme.borderRadius` is omitted. */
export type DefaultRoundedValue = (typeof DEFAULT_ROUNDED_VALUES)[number];

/** One of `DEFAULT_BORDER_VALUES` (`0 | 1 | 2 | 4`), the widths used when `theme.borderWidth` is omitted. */
export type DefaultBorderValue = (typeof DEFAULT_BORDER_VALUES)[number];
