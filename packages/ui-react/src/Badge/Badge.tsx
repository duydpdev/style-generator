import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { BadgeDeps } from "./Badge.types";

export const createBadge = (deps: BadgeDeps) =>
  function Badge({
    as,
    className,
    style,
    color,
    variant,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "span";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.badge({ color, variant }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
