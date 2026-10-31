import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { TextDeps } from "./Text.types";

export const createText = (deps: TextDeps) =>
  function Text({
    as,
    className,
    style,
    type = deps.defaults.type,
    color = deps.defaults.color,
    align,
    decoration,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "p";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.text({ type, color, align, decoration }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
