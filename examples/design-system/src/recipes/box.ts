import type { VariantProps } from "class-variance-authority";
import type { SpacingProps } from "@duydpdev/style-generator/recipes";
import type {
  BackdropBlurVariant,
  BorderWidthVariant,
  BreakpointKeys,
  RoundedVariant,
  ShadowVariant,
} from "@duydpdev/style-generator/types";

import type { options } from "../style-gen.options";
import { tokens, type ColorValue, type Theme } from "../tokens";

import {
  createBoxRecipe,
  type BoxAspect,
  type BoxCursor,
  type BoxDisplay,
  type BoxObjectFit,
  type BoxOpacity,
  type BoxOverflow,
  type BoxPointerEvents,
  type BoxPreset,
  type BoxSelect,
  type BoxTransition,
  type BoxVariantKey,
  type BoxVisibility,
  type BoxZIndex,
} from "./factories/box";

/** Every design-system Box is `relative` (the inner-border overlay is positioned against it). */
export const boxPreset = { base: "relative" } as const satisfies BoxPreset;

/** Props of the bound box recipe: the token-typed box variants. */
export type BoxRecipeProps = Readonly<
  { [K in BoxVariantKey]?: BoxStyleProps[K] | null | undefined } & {
    innerBorder?: boolean | null | undefined;
    overlay?: boolean | null | undefined;
  }
>;

/**
 * Headless box recipe: `boxRecipe({ backgroundColor, borderColor, ringColor,
 * outlineColor, border*, rounded*, shadow, backdropBlur, position, display,
 * overflow, zIndex, opacity, cursor, pointerEvents, select, transition,
 * aspect, objectFit, visibility, innerBorder })`. The colors take a token or
 * `token/step`. Spacing is not a variant: split it off with
 * `splitSpacingProps(props, tokens.spacingProperties)`.
 */
export const boxRecipe: (props?: BoxRecipeProps) => string = createBoxRecipe(
  tokens,
  boxPreset,
);

export type BoxVariants = VariantProps<typeof boxRecipe>;

/**
 * The responsive spacing props of a `Box` (`p`, `px`, …, `gap`, `gapX`,
 * `gapY`): numbers or `{ base, md, lg }` objects. The breakpoint keys come
 * from `options.breakpoints`, so `{ xl: 4 }` is a type error.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-arguments -- today equal to the default (md | lg); stays tied to options.breakpoints when it changes
export type BoxSpacingProps = SpacingProps<BreakpointKeys<typeof options>>;

/** Token-typed style props a framework `Box` accepts besides spacing. */
export interface BoxStyleProps {
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
  border?: BorderWidthVariant<Theme>;
  borderX?: BorderWidthVariant<Theme>;
  borderY?: BorderWidthVariant<Theme>;
  borderT?: BorderWidthVariant<Theme>;
  borderB?: BorderWidthVariant<Theme>;
  borderL?: BorderWidthVariant<Theme>;
  borderR?: BorderWidthVariant<Theme>;
  rounded?: RoundedVariant<Theme>;
  roundedT?: RoundedVariant<Theme>;
  roundedB?: RoundedVariant<Theme>;
  roundedL?: RoundedVariant<Theme>;
  roundedR?: RoundedVariant<Theme>;
  shadow?: ShadowVariant<Theme>;
  backdropBlur?: BackdropBlurVariant<Theme>;
  position?: "absolute" | "relative" | "fixed" | "sticky";
  display?: BoxDisplay;
  overflow?: BoxOverflow;
  zIndex?: BoxZIndex;
  opacity?: BoxOpacity;
  cursor?: BoxCursor;
  pointerEvents?: BoxPointerEvents;
  select?: BoxSelect;
  transition?: BoxTransition;
  aspect?: BoxAspect;
  objectFit?: BoxObjectFit;
  visibility?: BoxVisibility;
  ringColor?: ColorValue;
  outlineColor?: ColorValue;
  innerBorder?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  minWidth?: number | string;
}
