import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { CodeDeps } from "./Code.types";

export const createCode = (deps: CodeDeps) =>
  function Code({
    as,
    className,
    style,
    type = deps.defaults.type,
    color,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "code";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.code({ type, color }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
