import type { ComponentPropsWithRef, ReactNode } from "react";

export interface ToastOwnProps {
  readonly title: ReactNode;
  /** The message under the title. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

export type ToastProps = ToastOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof ToastOwnProps>;
