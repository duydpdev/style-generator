import type { JSX } from "react";

import { cn } from "../../theme";

import { drawerRecipe } from "./style";
import type {
  DrawerContentProps,
  DrawerDescriptionProps,
  DrawerOverlayProps,
  DrawerTitleProps,
} from "./types";

/**
 * The drawer parts style an open modal panel docked to one edge; opening, closing, `Escape`,
 * focus moving into the panel and the focus trap belong to the app. Render the overlay and
 * the content together while the drawer is open.
 */

/** `DrawerOverlay`: the blurred scrim behind the panel, on the `overlay` layer. */
export function DrawerOverlay({
  className,
  ...rest
}: DrawerOverlayProps): JSX.Element {
  return (
    <div
      aria-hidden
      {...rest}
      className={cn(drawerRecipe({ slot: "overlay" }), className) || undefined}
    />
  );
}

/** `DrawerContent`: the docked `role="dialog"` panel (`aria-modal`), on the `modal` layer. */
export function DrawerContent({
  side,
  className,
  ...rest
}: DrawerContentProps): JSX.Element {
  return (
    <div
      {...rest}
      role="dialog"
      aria-modal="true"
      className={
        cn(drawerRecipe({ slot: "content", side }), className) || undefined
      }
    />
  );
}

/** `DrawerTitle`: the panel's heading; give it an `id` and point `aria-labelledby` at it. */
export function DrawerTitle({
  className,
  ...rest
}: DrawerTitleProps): JSX.Element {
  return (
    <h2
      {...rest}
      className={cn(drawerRecipe({ slot: "title" }), className) || undefined}
    />
  );
}

/** `DrawerDescription`: supporting text under the title, in `muted`. */
export function DrawerDescription({
  className,
  ...rest
}: DrawerDescriptionProps): JSX.Element {
  return (
    <p
      {...rest}
      className={
        cn(drawerRecipe({ slot: "description" }), className) || undefined
      }
    />
  );
}
