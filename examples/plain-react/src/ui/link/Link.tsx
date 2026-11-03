import type { ElementType, JSX } from "react";

import { cn } from "../../theme";

import { linkRecipe } from "./style";
import type { LinkProps } from "./types";

/** `Link`: an anchor (or `as`); tone and underline from the link recipe. */
export function Link<T extends ElementType = "a">({
  as,
  tone,
  underline,
  className,
  ...rest
}: LinkProps<T>): JSX.Element {
  const Component: ElementType = as ?? "a";
  return (
    <Component
      {...rest}
      className={cn(linkRecipe({ tone, underline }), className) || undefined}
    />
  );
}
