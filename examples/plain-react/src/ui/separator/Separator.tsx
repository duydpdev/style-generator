import type { JSX } from "react";

import { cn } from "../../theme";

import { separatorRecipe } from "./style";
import type { SeparatorProps } from "./types";

/** `Separator`: a `role="separator"` rule; `decorative` turns it into `role="none"`. */
export function Separator({
  orientation = "horizontal",
  decorative = false,
  className,
  ...rest
}: SeparatorProps): JSX.Element {
  return (
    <div
      {...rest}
      role={decorative ? "none" : "separator"}
      aria-orientation={
        !decorative && orientation === "vertical" ? "vertical" : undefined
      }
      className={cn(separatorRecipe({ orientation }), className) || undefined}
    />
  );
}
