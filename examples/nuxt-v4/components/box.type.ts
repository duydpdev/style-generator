import type { ResponsiveValue } from "@duydpdev/style-generator/spacing";
import type {
  ColorVariant,
  ShadowVariant,
  BackdropBlurVariant,
  BorderVariant,
  RoundedVariant,
} from "@duydpdev/style-generator/types";

import type { Theme } from "../theme/design-tokens";

export interface SpacingProperties {
  /** Padding (all sides) */
  p?: ResponsiveValue<number>;
  /** Padding horizontal */
  px?: ResponsiveValue<number>;
  /** Padding vertical */
  py?: ResponsiveValue<number>;
  /** Padding top */
  pt?: ResponsiveValue<number>;
  /** Padding bottom */
  pb?: ResponsiveValue<number>;
  /** Padding left */
  pl?: ResponsiveValue<number>;
  /** Padding right */
  pr?: ResponsiveValue<number>;
  /** Margin (all sides) */
  m?: ResponsiveValue<number>;
  /** Margin horizontal */
  mx?: ResponsiveValue<number>;
  /** Margin vertical */
  my?: ResponsiveValue<number>;
  /** Margin top */
  mt?: ResponsiveValue<number>;
  /** Margin bottom */
  mb?: ResponsiveValue<number>;
  /** Margin left */
  ml?: ResponsiveValue<number>;
  /** Margin right */
  mr?: ResponsiveValue<number>;
  /** Top position offset */
  top?: ResponsiveValue<number>;
  /** Left position offset */
  left?: ResponsiveValue<number>;
  /** Right position offset */
  right?: ResponsiveValue<number>;
  /** Bottom position offset */
  bottom?: ResponsiveValue<number>;
  /** Gap (flex/grid) */
  gap?: ResponsiveValue<number>;
  /** Column gap (flex/grid) */
  gapX?: ResponsiveValue<number>;
  /** Row gap (flex/grid) */
  gapY?: ResponsiveValue<number>;
}

export interface StyleProperties {
  backgroundColor?: ColorVariant<Theme>;
  borderColor?: ColorVariant<Theme>;
  border?: BorderVariant<Theme>;
  borderX?: BorderVariant<Theme>;
  borderY?: BorderVariant<Theme>;
  borderT?: BorderVariant<Theme>;
  borderB?: BorderVariant<Theme>;
  borderL?: BorderVariant<Theme>;
  borderR?: BorderVariant<Theme>;
  rounded?: RoundedVariant<Theme>;
  roundedT?: RoundedVariant<Theme>;
  roundedB?: RoundedVariant<Theme>;
  roundedL?: RoundedVariant<Theme>;
  roundedR?: RoundedVariant<Theme>;
  shadow?: ShadowVariant<Theme>;
  backdropBlur?: BackdropBlurVariant<Theme>;
  position?: "absolute" | "relative" | "fixed" | "sticky";
  width?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  minWidth?: number | string;
}

/**
 * Box props for the Vue port. `class` / `style` are intentionally NOT declared
 * here — Vue merges parent-passed `class`/`style` with the component's bound
 * `:class`/`:style` automatically through attribute fallthrough, so the
 * resolved cva + spacing classes combine with caller overrides for free.
 */
export interface BoxProps extends SpacingProperties, StyleProperties {
  innerBorder?: boolean;
  /** Polymorphic tag — defaults to `div`. */
  as?: string;
}
