import type { ComponentPropsWithRef, ReactNode } from "react";

import type { CheckboxIntent } from "./style";

export interface CheckboxOwnProps {
  /** One of `checkboxIntents`; the colour of the checked checkbox. */
  readonly color?: CheckboxIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** The label; without it, pass `aria-label`. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

export type CheckboxProps = CheckboxOwnProps &
  Omit<ComponentPropsWithRef<"input">, keyof CheckboxOwnProps | "type">;
