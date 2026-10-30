import {
  gridColumns,
  type GridColumnsValue,
} from "design-system-example/recipes";
import type { JSX } from "react";

import { mergeStyle, splitStyleProps } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { GridDeps } from "./Grid.types";

export const createGrid = (deps: GridDeps) =>
  function Grid({
    as,
    className,
    style,
    columns,
    align,
    justify,
    flow,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "div";
    const split = splitStyleProps(props, deps.layout, deps.spacing);
    const cols =
      columns === undefined
        ? undefined
        : gridColumns(columns as GridColumnsValue);
    return (
      <Component
        {...split.rest}
        className={deps.cn(
          deps.grid({ align, justify, flow }),
          cols?.className,
          split.className,
          className,
        )}
        style={mergeStyle({ ...split.style, ...cols?.style }, style)}
      />
    );
  };
