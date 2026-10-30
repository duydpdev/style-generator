import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { FlexDeps } from "./Flex.types";

export const createFlex = (
  deps: FlexDeps,
  defaultDirection: "row" | "column",
) =>
  function Flex({
    as,
    className,
    style,
    direction = defaultDirection,
    align,
    justify,
    wrap,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "div";
    const split = splitStyleProps(props, deps.layout, deps.spacing);
    return (
      <Component
        {...split.rest}
        className={deps.cn(
          deps.stack({ direction, align, justify, wrap }),
          split.className,
          className,
        )}
        style={mergeStyle(split.style, style)}
      />
    );
  };
