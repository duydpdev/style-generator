import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { ListItemDeps } from "./ListItem.types";

export const createListItem = (deps: ListItemDeps) =>
  function ListItem({
    as,
    className,
    style,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "li";
    const split = splitStyleProps(props, deps.layout, deps.spacing);
    return (
      <Component
        {...split.rest}
        className={deps.cn(split.className, className)}
        style={mergeStyle(split.style, style)}
      />
    );
  };
