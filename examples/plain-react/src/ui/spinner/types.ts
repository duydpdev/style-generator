import type { ComponentPropsWithRef } from "react";

import type { SpinnerIntent } from "./style";

export interface SpinnerOwnProps {
  /** One of `spinnerIntents`. */
  readonly color?: SpinnerIntent | undefined;
  /** The box, one `iconSize` key. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** The accessible name; `"Loading"` by default. */
  readonly label?: string | undefined;
  readonly className?: string | undefined;
}

export type SpinnerProps = SpinnerOwnProps &
  Omit<
    ComponentPropsWithRef<"span">,
    keyof SpinnerOwnProps | "role" | "aria-label" | "children"
  >;
