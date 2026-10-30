import type { JSX, ReactNode } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { ButtonDeps } from "./Button.types";

export const createButton = (deps: ButtonDeps) =>
  function Button({
    as,
    className,
    style,
    variant,
    color,
    size,
    prefix,
    suffix,
    children,
    type,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "button";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        type={Component === "button" ? (type ?? "button") : type}
        data-slot="button"
        className={deps.cn(
          deps.button({ variant, color, size }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      >
        {prefix != null && <span data-icon="start">{prefix as ReactNode}</span>}
        <span>{children}</span>
        {suffix != null && <span data-icon="end">{suffix as ReactNode}</span>}
      </Component>
    );
  };
