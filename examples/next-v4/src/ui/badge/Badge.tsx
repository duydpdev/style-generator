import type { ElementType, JSX } from "react";

import { cn } from "../../theme";

import { badgeRecipe } from "./style";
import type { BadgeProps } from "./types";

/** `Badge`: a short label; `color` × `variant` from the badge recipe. */
export function Badge<T extends ElementType = "span">({
  as,
  color,
  variant,
  className,
  ...rest
}: BadgeProps<T>): JSX.Element {
  const Component: ElementType = as ?? "span";
  return (
    <Component
      {...rest}
      className={cn(badgeRecipe({ color, variant }), className) || undefined}
    />
  );
}
