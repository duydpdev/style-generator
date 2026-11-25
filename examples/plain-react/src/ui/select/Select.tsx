import type { JSX } from "react";

import { cn } from "../../theme";

import { selectRecipe } from "./style";
import type { SelectProps } from "./types";

/** `Select`: a native `<select>` (pass `<option>` children); `size` and `invalid` from the select recipe. */
export function Select({
  size,
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ...rest
}: SelectProps): JSX.Element {
  return (
    <select
      {...rest}
      aria-invalid={invalid === true ? true : ariaInvalid}
      className={cn(selectRecipe({ size }), className) || undefined}
    />
  );
}
