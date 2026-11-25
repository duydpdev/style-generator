import type { JSX } from "react";

import { cn } from "../../theme";

import { popoverRecipe } from "./style";
import type { PopoverContentProps } from "./types";

/**
 * `PopoverContent`: a non-modal panel (`role="dialog"` unless `role` says otherwise) on the
 * `modal` layer. Its position next to the trigger, opening, closing and focus belong to the
 * app (anchor positioning, the `popover` attribute or a positioning library).
 */
export function PopoverContent({
  role = "dialog",
  className,
  ...rest
}: PopoverContentProps): JSX.Element {
  return (
    <div
      {...rest}
      role={role}
      className={cn(popoverRecipe(), className) || undefined}
    />
  );
}
