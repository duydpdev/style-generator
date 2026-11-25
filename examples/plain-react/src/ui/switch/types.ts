import type { ComponentPropsWithRef } from "react";

import type { SwitchIntent } from "./style";

export interface SwitchOwnProps {
  /** One of `switchIntents`; the track colour when on. */
  readonly color?: SwitchIntent | undefined;
  /** Thumb size (`iconSize`); the track follows it. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  /** Controlled state; leave it out and use `defaultChecked` for an uncontrolled switch. */
  readonly checked?: boolean | undefined;
  readonly defaultChecked?: boolean | undefined;
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined;
  readonly className?: string | undefined;
}

export type SwitchProps = SwitchOwnProps &
  Omit<
    ComponentPropsWithRef<"button">,
    | keyof SwitchOwnProps
    | "type"
    | "role"
    | "aria-checked"
    | "children"
    | "name"
    | "value"
    | "form"
  >;
