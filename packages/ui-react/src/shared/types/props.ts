import type { SpacingProps } from "@duydpdev/style-generator/recipes";
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import type { FlexAlign, FlexJustify } from "design-system-example/recipes";
import type { ComponentPropsWithRef, ReactNode } from "react";

import type {
  BlurKey,
  BorderWidthKey,
  BreakpointKey,
  ColorKey,
  RadiusKey,
  ShadowKey,
  SpacingPropertyKey,
  TypographyKey,
  UiTokens,
} from "./tokens";

export type ControlSize = "sm" | "md" | "lg";

/** Every key of `tokens.spacingProperties`, camelCased: a number or `{ base, <bp> }`. */
export type UiSpacingProps<W extends UiTokens> = SpacingProps<
  BreakpointKey<W>,
  SpacingPropertyKey<W>
>;

/** Inline size: a number is px (as React does), a string is any CSS length. */
export type LayoutSize = number | string;

export interface LayoutStyleProps<W extends UiTokens> {
  readonly backgroundColor?: ColorKey<W> | undefined;
  readonly borderColor?: ColorKey<W> | undefined;
  readonly border?: BorderWidthKey<W> | undefined;
  readonly borderX?: BorderWidthKey<W> | undefined;
  readonly borderY?: BorderWidthKey<W> | undefined;
  readonly borderT?: BorderWidthKey<W> | undefined;
  readonly borderB?: BorderWidthKey<W> | undefined;
  readonly borderL?: BorderWidthKey<W> | undefined;
  readonly borderR?: BorderWidthKey<W> | undefined;
  readonly rounded?: RadiusKey<W> | undefined;
  readonly roundedT?: RadiusKey<W> | undefined;
  readonly roundedB?: RadiusKey<W> | undefined;
  readonly roundedL?: RadiusKey<W> | undefined;
  readonly roundedR?: RadiusKey<W> | undefined;
  readonly shadow?: ShadowKey<W> | undefined;
  readonly backdropBlur?: BlurKey<W> | undefined;
  readonly position?: "absolute" | "relative" | "fixed" | "sticky" | undefined;
  readonly width?: LayoutSize | undefined;
  readonly height?: LayoutSize | undefined;
  readonly minWidth?: LayoutSize | undefined;
  readonly minHeight?: LayoutSize | undefined;
  readonly maxWidth?: LayoutSize | undefined;
  readonly maxHeight?: LayoutSize | undefined;
}

export type LayoutProps<W extends UiTokens> = LayoutStyleProps<W> &
  UiSpacingProps<W>;
export type BoxOwnProps<W extends UiTokens> = LayoutProps<W> & {
  readonly innerBorder?: boolean | undefined;
};
export type FlexOwnProps<W extends UiTokens> = LayoutProps<W> & {
  readonly direction?: "row" | "column" | undefined;
  readonly align?: FlexAlign | undefined;
  readonly justify?: FlexJustify | undefined;
  readonly wrap?: boolean | undefined;
};
export type GridOwnProps<W extends UiTokens> = LayoutProps<W> & {
  readonly columns?:
    | ResponsiveValueStrict<number, BreakpointKey<W>>
    | undefined;
  readonly align?: FlexAlign | undefined;
  readonly justify?: FlexJustify | undefined;
  readonly flow?: "row" | "column" | "dense" | undefined;
};
/** No horizontal margins: the container centres itself (`mx-auto`). */
export type ContainerOwnProps<W extends UiTokens> = Omit<
  LayoutProps<W>,
  "m" | "mx" | "ml" | "mr"
>;
export type TextOwnProps<W extends UiTokens> = UiSpacingProps<W> & {
  readonly type?: TypographyKey<W> | undefined;
  readonly color?: ColorKey<W> | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
};
export type LinkOwnProps<W extends UiTokens> = UiSpacingProps<W> & {
  readonly color?: ColorKey<W> | undefined;
  readonly underline?: "always" | "hover" | "none" | undefined;
};
/** `position` is the list-style position here, so the Box's CSS `position` prop is left out. */
export type ListOwnProps<W extends UiTokens> = Omit<
  LayoutProps<W>,
  "position"
> & {
  readonly marker?: "none" | "disc" | "decimal" | undefined;
  readonly position?: "inside" | "outside" | undefined;
};
export type CodeOwnProps<W extends UiTokens> = UiSpacingProps<W> & {
  readonly type?: TypographyKey<W> | undefined;
  readonly color?: ColorKey<W> | undefined;
};
export type ButtonOwnProps<
  W extends UiTokens,
  B extends string,
> = UiSpacingProps<W> & {
  readonly variant?: "fill" | "outline" | "soft" | "ghost" | "link" | undefined;
  readonly color?: B | undefined;
  readonly size?: ControlSize | undefined;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
};
export type CardOwnProps<W extends UiTokens> = UiSpacingProps<W> & {
  readonly tone?: "surface" | "muted" | "outline" | undefined;
  readonly padding?: "none" | "sm" | "md" | "lg" | undefined;
};
export type BadgeOwnProps<
  W extends UiTokens,
  G extends string,
> = UiSpacingProps<W> & {
  readonly color?: G | undefined;
  readonly variant?: "soft" | "solid" | "outline" | undefined;
};
export type InputProps = Omit<ComponentPropsWithRef<"input">, "size"> & {
  readonly size?: ControlSize | undefined;
  readonly invalid?: boolean | undefined;
};
export type SelectProps = Omit<ComponentPropsWithRef<"select">, "size"> & {
  readonly size?: ControlSize | undefined;
  readonly invalid?: boolean | undefined;
};
export type DialogProps<W extends UiTokens> = Omit<
  ComponentPropsWithRef<"div">,
  "role"
> & {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly size?: ControlSize | undefined;
  readonly blur?: "none" | BlurKey<W> | undefined;
};
