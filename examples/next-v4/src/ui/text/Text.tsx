import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import { textRecipe } from "./style";
import type { TextProps } from "./types";

/** `Text`: typography, color, align, decoration, transform, italic, truncate, line clamp, wrap and spacing props. */
export function Text<T extends ElementType = "p">({
  as,
  className,
  style,
  type,
  color,
  align,
  decoration,
  transform,
  italic,
  truncate,
  lineClamp,
  wrap,
  ...props
}: TextProps<T>): JSX.Element {
  const Component: ElementType = as ?? "p";
  const split = splitSpacing(props, tokens.spacingProperties);
  return (
    <Component
      {...split.rest}
      className={
        cn(
          textRecipe({
            type,
            color,
            align,
            decoration,
            transform,
            italic,
            truncate,
            lineClamp,
            wrap,
          }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    />
  );
}
