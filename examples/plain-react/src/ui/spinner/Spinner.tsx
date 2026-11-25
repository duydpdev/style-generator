import type { JSX } from "react";

import { cn } from "../../theme";

import { spinnerRecipe } from "./style";
import type { SpinnerProps } from "./types";

/** `Spinner`: an indeterminate busy ring, `role="status"` named by `label`. */
export function Spinner({
  color,
  size,
  label = "Loading",
  className,
  ...rest
}: SpinnerProps): JSX.Element {
  return (
    <span
      {...rest}
      role="status"
      aria-label={label}
      className={cn(spinnerRecipe({ color, size }), className) || undefined}
    />
  );
}
