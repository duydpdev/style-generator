import type { JSX } from "react";

import { cn } from "../../theme";

import { dialogRecipe } from "./style";
import type {
  DialogContentProps,
  DialogDescriptionProps,
  DialogOverlayProps,
  DialogTitleProps,
} from "./types";

/**
 * The dialog parts style an open modal; opening, closing, `Escape`, focus moving into the
 * panel and the focus trap belong to the app. Render the overlay and
 * the content together while the dialog is open.
 */

/** `DialogOverlay`: the blurred scrim behind the panel, on the `overlay` layer. */
export function DialogOverlay({
  className,
  ...rest
}: DialogOverlayProps): JSX.Element {
  return (
    <div
      aria-hidden
      {...rest}
      className={cn(dialogRecipe({ slot: "overlay" }), className) || undefined}
    />
  );
}

/** `DialogContent`: the centred `role="dialog"` panel (`aria-modal`), on the `modal` layer. */
export function DialogContent({
  size,
  className,
  ...rest
}: DialogContentProps): JSX.Element {
  return (
    <div
      {...rest}
      role="dialog"
      aria-modal="true"
      className={
        cn(dialogRecipe({ slot: "content", size }), className) || undefined
      }
    />
  );
}

/** `DialogTitle`: the panel's heading; give it an `id` and point `aria-labelledby` at it. */
export function DialogTitle({
  className,
  ...rest
}: DialogTitleProps): JSX.Element {
  return (
    <h2
      {...rest}
      className={cn(dialogRecipe({ slot: "title" }), className) || undefined}
    />
  );
}

/** `DialogDescription`: supporting text under the title, in `muted`. */
export function DialogDescription({
  className,
  ...rest
}: DialogDescriptionProps): JSX.Element {
  return (
    <p
      {...rest}
      className={
        cn(dialogRecipe({ slot: "description" }), className) || undefined
      }
    />
  );
}
