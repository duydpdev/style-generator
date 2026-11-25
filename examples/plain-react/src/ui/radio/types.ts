import type { ComponentPropsWithRef, ReactNode } from "react";

import type { RadioIntent } from "./style";

export interface RadioOwnProps {
  /** One of `radioIntents`; the colour of the checked radio. */
  readonly color?: RadioIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** The label; without it, pass `aria-label`. */
  readonly children?: ReactNode;
  readonly className?: string | undefined;
}

export type RadioProps = RadioOwnProps &
  Omit<ComponentPropsWithRef<"input">, keyof RadioOwnProps | "type">;
