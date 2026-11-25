import type { ComponentPropsWithRef } from "react";

export interface TooltipContentOwnProps {
  /** Point the trigger's `aria-describedby` at this id. */
  readonly id: string;
  readonly className?: string | undefined;
}

export type TooltipContentProps = TooltipContentOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof TooltipContentOwnProps | "role">;
