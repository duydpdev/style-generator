import type { JSX } from "react";

import { cn } from "../../theme";

import { radioRecipe } from "./style";
import type { RadioProps } from "./types";

/** `Radio`: a native `<input type="radio">`, wrapped in a `<label>` with `children` when they are given; `className` goes to the input. */
export function Radio({
  color,
  size,
  children,
  className,
  ...rest
}: RadioProps): JSX.Element {
  const input = (
    <input
      {...rest}
      type="radio"
      className={cn(radioRecipe({ color, size }), className) || undefined}
    />
  );
  if (children === undefined) return input;
  return (
    <label className="inline-flex items-center gap-2">
      {input}
      {children}
    </label>
  );
}
