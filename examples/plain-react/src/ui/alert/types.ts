import type { ComponentPropsWithRef, ReactNode } from "react";

import type { AlertIntent } from "./style";

export interface AlertOwnProps {
  /** One of `alertIntents`. */
  readonly color?: AlertIntent | undefined;
  /** `soft` (default) a tinted panel, `outline` an intent border, `solid` an intent fill. */
  readonly variant?: "soft" | "outline" | "solid" | undefined;
  /** An optional heading above the message. */
  readonly title?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

export type AlertProps = AlertOwnProps &
  Omit<ComponentPropsWithRef<"div">, keyof AlertOwnProps>;
