import type { JSX } from "react";

import { cn } from "../../theme";

import { inputRecipe } from "./style";
import type { InputProps } from "./types";

/** `Input`: a native text input; `size` and `invalid` from the input recipe. */
export function Input({
  size,
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ...rest
}: InputProps): JSX.Element {
  return (
    <input
      {...rest}
      aria-invalid={invalid === true ? true : ariaInvalid}
      className={cn(inputRecipe({ size }), className) || undefined}
    />
  );
}
