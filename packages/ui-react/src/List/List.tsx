import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { ListDeps } from "./List.types";

export const createList = (deps: ListDeps) =>
  function List({
    as,
    className,
    style,
    marker,
    position,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "ul";
    const split = splitStyleProps(props, deps.layout, deps.spacing);
    return (
      <Component
        {...split.rest}
        className={deps.cn(
          deps.list({ marker, position }),
          split.className,
          className,
        )}
        style={mergeStyle(split.style, style)}
      />
    );
  };
