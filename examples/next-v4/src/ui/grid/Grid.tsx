import { mergeStyle, splitLayout } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import {
  LAYOUT_SIZE_KEYS,
  LAYOUT_VARIANT_KEYS,
  gridColumns,
  gridRecipe,
  layoutRecipe,
} from "./style";
import type { GridProps } from "./types";

/** `Grid`: `columns` (count or track list per breakpoint) + grid alignment. */
export function Grid<T extends ElementType = "div">({
  as,
  className,
  style,
  columns,
  align,
  justify,
  flow,
  ...props
}: GridProps<T>): JSX.Element {
  const Component: ElementType = as ?? "div";
  const split = splitLayout(
    props,
    layoutRecipe,
    tokens.spacingProperties,
    LAYOUT_VARIANT_KEYS,
    LAYOUT_SIZE_KEYS,
  );
  const cols = columns === undefined ? undefined : gridColumns(columns);
  return (
    <Component
      {...split.rest}
      className={
        cn(
          gridRecipe({ align, justify, flow }),
          cols?.className,
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, cols?.style, style)}
    />
  );
}
