import type { JSX } from "react";

import { cn } from "../../theme";

import { tooltipRecipe } from "./style";
import type { TooltipContentProps } from "./types";

/**
 * `TooltipContent`: a `role="tooltip"` label on the `modal` layer, described from the
 * trigger by `aria-describedby={id}`. Showing it on hover and focus, hiding it on `Escape`
 * and placing it belong to the app; it never holds interactive content.
 */
export function TooltipContent({
  className,
  ...rest
}: TooltipContentProps): JSX.Element {
  return (
    <div
      {...rest}
      role="tooltip"
      className={cn(tooltipRecipe(), className) || undefined}
    />
  );
}
