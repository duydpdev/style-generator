import type { ComponentPropsWithRef } from "react";

export interface DrawerContentOwnProps {
  /** The edge the panel is docked to and slides in from; `right` by default. */
  readonly side?: "left" | "right" | "bottom" | undefined;
  readonly className?: string | undefined;
}

/** Name the panel with `aria-labelledby` (the `DrawerTitle`'s id) or `aria-label`. */
export type DrawerContentProps = DrawerContentOwnProps &
  Omit<
    ComponentPropsWithRef<"div">,
    keyof DrawerContentOwnProps | "role" | "aria-modal"
  >;

export type DrawerOverlayProps = ComponentPropsWithRef<"div">;
export type DrawerTitleProps = ComponentPropsWithRef<"h2">;
export type DrawerDescriptionProps = ComponentPropsWithRef<"p">;
