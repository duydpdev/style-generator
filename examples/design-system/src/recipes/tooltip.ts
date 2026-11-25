import { tokens } from "../tokens";

import { createTooltipRecipe, type TooltipPreset } from "./factories/tooltip";

/** Tooltip roles: `foreground` fill with `background` text (inverted in both themes), `sm` radius, `text12Mono`, on the `modal` layer; it fades in `fast`. */
export const tooltipPreset = {
  fill: "foreground",
  text: "background",
  radius: "sm",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  type: "text12Mono",
} as const satisfies TooltipPreset;

/** `tooltipRecipe()` → the tooltip's class. */
export const tooltipRecipe = createTooltipRecipe(tokens, tooltipPreset);
