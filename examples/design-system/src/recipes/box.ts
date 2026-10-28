import { cva, type VariantProps } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import type { SpacingProps } from "@duydpdev/style-generator/recipes";
import type {
  BackdropBlurVariant,
  BorderWidthVariant,
  BreakpointKeys,
  ColorVariant,
  RoundedVariant,
  ShadowVariant,
} from "@duydpdev/style-generator/types";

import type { options } from "../style-gen.options";
import { tokens, type Theme } from "../tokens";

/**
 * Headless box recipe: `boxRecipe({ backgroundColor, borderColor, border*,
 * rounded*, shadow, backdropBlur, position, innerBorder })`. Spacing is not a
 * variant: split it off with `splitSpacingProps(props, tokens.spacingProperties)`.
 */
export const boxRecipe = cva("relative", {
  variants: {
    backgroundColor: createVariantMapper("bg", tokens.colors),
    borderColor: createVariantMapper("border", tokens.colors),
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
    innerBorder: {
      true: "!border-none",
    },
  },
});

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
  backgroundColor?: ColorVariant<Theme>;
  borderColor?: ColorVariant<Theme>;
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
  innerBorder?: boolean;
  width?: number | string;
  maxWidth?: number | string;
  height?: number | string;
  minHeight?: number | string;
  maxHeight?: number | string;
  minWidth?: number | string;
}
