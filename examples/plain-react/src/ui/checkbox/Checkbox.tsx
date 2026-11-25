import type { JSX } from "react";

import { cn } from "../../theme";

import { checkboxRecipe } from "./style";
import type { CheckboxProps } from "./types";

/** `Checkbox`: a native `<input type="checkbox">`, wrapped in a `<label>` with `children` when they are given; `className` goes to the input. */
export function Checkbox({
  color,
  size,
  children,
  className,
  ...rest
}: CheckboxProps): JSX.Element {
  const input = (
    <input
      {...rest}
      type="checkbox"
      className={cn(checkboxRecipe({ color, size }), className) || undefined}
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
