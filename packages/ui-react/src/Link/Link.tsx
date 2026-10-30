import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { LinkDeps } from "./Link.types";

export const createLink = (deps: LinkDeps) =>
  function Link({
    as,
    className,
    style,
    color,
    underline,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "a";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.link({ color, underline }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
