import type { JSX } from "react";

import { cn } from "../../theme";

import { sliderRecipe } from "./style";
import type { SliderProps } from "./types";

/** `Slider`: a native `<input type="range">` (`min`, `max`, `step`, `value` as usual); `color` and `size` from the slider recipe. */
export function Slider({
  color,
  size,
  className,
  ...rest
}: SliderProps): JSX.Element {
  return (
    <input
      {...rest}
      type="range"
      className={cn(sliderRecipe({ color, size }), className) || undefined}
    />
  );
}
