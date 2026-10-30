import type { JSX } from "react";

import { mergeStyle, splitSpacing } from "../shared/splitStyleProps";
import type { LooseProps } from "../shared/types";

import type { CardDeps } from "./Card.types";

export const createCard = (deps: CardDeps) =>
  function Card({
    as,
    className,
    style,
    tone,
    padding,
    ...props
  }: LooseProps): JSX.Element {
    const Component = as ?? "div";
    const spacing = splitSpacing(props, deps.spacing);
    return (
      <Component
        {...spacing.rest}
        className={deps.cn(
          deps.card({ tone, padding }),
          spacing.className,
          className,
        )}
        style={mergeStyle(spacing.style, style)}
      />
    );
  };
