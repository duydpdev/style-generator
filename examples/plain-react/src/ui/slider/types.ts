import type { ComponentPropsWithRef } from "react";

import type { SliderIntent } from "./style";

export interface SliderOwnProps {
  /** One of `sliderIntents`; the colour of the filled track and the thumb. */
  readonly color?: SliderIntent | undefined;
  /** Height of the hit area. */
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly className?: string | undefined;
}

export type SliderProps = SliderOwnProps &
  Omit<ComponentPropsWithRef<"input">, keyof SliderOwnProps | "type">;
