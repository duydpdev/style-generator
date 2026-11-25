import type { ComponentPropsWithRef } from "react";

export interface DialogContentOwnProps {
  /** The panel's maximum width; `md` by default. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly className?: string | undefined;
}

/** Name the panel with `aria-labelledby` (the `DialogTitle`'s id) or `aria-label`. */
export type DialogContentProps = DialogContentOwnProps &
  Omit<
    ComponentPropsWithRef<"div">,
    keyof DialogContentOwnProps | "role" | "aria-modal"
  >;

export type DialogOverlayProps = ComponentPropsWithRef<"div">;
export type DialogTitleProps = ComponentPropsWithRef<"h2">;
export type DialogDescriptionProps = ComponentPropsWithRef<"p">;
