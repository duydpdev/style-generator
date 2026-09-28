import type { ComponentProps, ElementType } from "react";
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";
import type {
  ColorVariant,
  ShadowVariant,
  BackdropBlurVariant,
  BorderVariant,
  RoundedVariant,
} from "@duydpdev/style-generator/types";

import type { Theme } from "../../theme/design-tokens";

export interface SpacingProperties {
  /** Padding (all sides) */
  p?: ResponsiveValueStrict<number>;
  /** Padding horizontal */
  px?: ResponsiveValueStrict<number>;
  /** Padding vertical */
  py?: ResponsiveValueStrict<number>;
  /** Padding top */
  pt?: ResponsiveValueStrict<number>;
  /** Padding bottom */
  pb?: ResponsiveValueStrict<number>;
  /** Padding left */
  pl?: ResponsiveValueStrict<number>;
  /** Padding right */
  pr?: ResponsiveValueStrict<number>;
  /** Margin (all sides) */
  m?: ResponsiveValueStrict<number>;
  /** Margin horizontal */
  mx?: ResponsiveValueStrict<number>;
  /** Margin vertical */
  my?: ResponsiveValueStrict<number>;
  /** Margin top */
  mt?: ResponsiveValueStrict<number>;
  /** Margin bottom */
  mb?: ResponsiveValueStrict<number>;
  /** Margin left */
  ml?: ResponsiveValueStrict<number>;
  /** Margin right */
  mr?: ResponsiveValueStrict<number>;
  /** Top position offset */
  top?: ResponsiveValueStrict<number>;
  /** Left position offset */
  left?: ResponsiveValueStrict<number>;
  /** Right position offset */
  right?: ResponsiveValueStrict<number>;
  /** Bottom position offset */
  bottom?: ResponsiveValueStrict<number>;
  /** Gap (flex/grid) */
  gap?: ResponsiveValueStrict<number>;
  /** Column gap (flex/grid) */
  gapX?: ResponsiveValueStrict<number>;
  /** Row gap (flex/grid) */
  gapY?: ResponsiveValueStrict<number>;
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

export interface BoxProps
  extends
    Omit<ComponentProps<"div">, "color">,
    SpacingProperties,
    StyleProperties {
  innerBorder?: boolean;
  as?: ElementType;
}
