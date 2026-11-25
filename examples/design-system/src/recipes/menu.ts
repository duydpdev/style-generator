import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import { createMenuRecipe, type MenuPreset } from "./factories/menu";

/** Menu roles: the popover's panel; an item in `text14Regular` `foreground` with an `sm` radius, highlighted with `primarySubtle` on hover and keyboard focus. */
export const menuPreset = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "md",
  shadow: "md",
  layer: "modal",
  duration: "fast",
  easing: "standard",
  itemRadius: "sm",
  type: "text14Regular",
  text: "foreground",
  highlight: "hover:bg-primary-subtle focus-visible:bg-primary-subtle",
  disabled: checkboxPreset.disabled,
} as const satisfies MenuPreset;

/** `menuRecipe({ slot })` → the class of one menu part (`content`, `item`, `separator`). */
export const menuRecipe = createMenuRecipe(tokens, menuPreset);
