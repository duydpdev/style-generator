import type { ComponentPropsWithRef } from "react";

import type { ProgressIntent } from "./style";

export interface ProgressOwnProps {
  /** How far along, from 0 to `max`; clamped into that range, and 0 when it is not a finite number. */
  readonly value: number;
  /** The value that means done; `100` by default, and when it is not a positive finite number. */
  readonly max?: number | undefined;
  /** One of `progressIntents`; the colour of the filled part. */
  readonly color?: ProgressIntent | undefined;
  /** The track height. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly className?: string | undefined;
}

export type ProgressProps = ProgressOwnProps &
  Omit<
    ComponentPropsWithRef<"div">,
    | keyof ProgressOwnProps
    | "role"
    | "aria-valuemin"
    | "aria-valuemax"
    | "aria-valuenow"
    | "children"
  >;
