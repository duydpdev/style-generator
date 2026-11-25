import { tokens } from "../tokens";

import { createPopoverRecipe, type PopoverPreset } from "./factories/popover";

/** Popover roles: a `surface` panel with the `border` colour, `md` radius and `md` shadow on the `modal` layer; it enters `fast` on the `standard` easing. */
export const popoverPreset = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "md",
  shadow: "md",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  type: "text14Regular",
  text: "foreground",
} as const satisfies PopoverPreset;

/** `popoverRecipe()` → the popover panel's class. */
export const popoverRecipe = createPopoverRecipe(tokens, popoverPreset);
