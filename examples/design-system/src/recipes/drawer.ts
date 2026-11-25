import { tokens } from "../tokens";

import { createDrawerRecipe, type DrawerPreset } from "./factories/drawer";

/** Drawer roles: the dialog's scrim and layers; a `surface` panel with the `border` colour and `lg` shadow that slides in `slow` on the `standard` easing. */
export const drawerPreset = {
  scrim: "background/80",
  blur: "sm",
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  shadow: "lg",
  overlayLayer: "overlay",
  modalLayer: "modal",
  duration: "slow",
  easing: "standard",
  type: { body: "text14Regular", title: "text16Medium" },
  text: "foreground",
  description: "muted",
} as const satisfies DrawerPreset;

/** `drawerRecipe({ slot, side })` → the class of one drawer part (`overlay`, `content`, `title`, `description`). */
export const drawerRecipe = createDrawerRecipe(tokens, drawerPreset);
