import type { ElementType, JSX } from "react";

import { cn } from "../../theme";

import { cardRecipe } from "./style";
import type { CardProps } from "./types";

/** `Card`: a surface; tone, padding, radius, shadow and border from the card recipe. */
export function Card<T extends ElementType = "div">({
  as,
  tone,
  padding,
  radius,
  shadow,
  border,
  className,
  ...rest
}: CardProps<T>): JSX.Element {
  const Component: ElementType = as ?? "div";
  return (
    <Component
      {...rest}
      className={
        cn(cardRecipe({ tone, padding, radius, shadow, border }), className) ||
        undefined
      }
    />
  );
}
