import { mergeStyle, splitLayout } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import {
  LAYOUT_SIZE_KEYS,
  LAYOUT_VARIANT_KEYS,
  flexRecipe,
  layoutRecipe,
} from "./style";
import type { FlexProps } from "./types";

/** Flex: a row of two or more items. */
export function Flex<T extends ElementType = "div">({
  as,
  className,
  style,
  direction,
  align,
  justify,
  wrap,
  ...props
}: FlexProps<T>): JSX.Element {
  const Component: ElementType = as ?? "div";
  const split = splitLayout(
    props,
    layoutRecipe,
    tokens.spacingProperties,
    LAYOUT_VARIANT_KEYS,
    LAYOUT_SIZE_KEYS,
  );
  return (
    <Component
      {...split.rest}
      className={
        cn(
          flexRecipe({ direction, align, justify, wrap }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    />
  );
}
