import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { ContainerDeps } from "./Container.types";

export const createContainer = (deps: ContainerDeps) =>
  function Container({
    as,
    className,
    style,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "div";
    const split = splitStyleProps(props, deps.layout, deps.spacing);
    return (
      <Component
        {...split.rest}
        className={deps.cn(deps.container(), split.className, className)}
        style={mergeStyle(split.style, style)}
      />
    );
  };
