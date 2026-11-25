import type { JSX } from "react";

import { cn } from "../../theme";

import { textareaRecipe } from "./style";
import type { TextareaProps } from "./types";

/** `Textarea`: a native multi-line text field; `size` and `invalid` from the textarea recipe. */
export function Textarea({
  size,
  invalid,
  className,
  "aria-invalid": ariaInvalid,
  ...rest
}: TextareaProps): JSX.Element {
  return (
    <textarea
      {...rest}
      aria-invalid={invalid === true ? true : ariaInvalid}
      className={cn(textareaRecipe({ size }), className) || undefined}
    />
  );
}
