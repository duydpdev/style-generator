import { tokens } from "../tokens";

import { createDialogRecipe, type DialogPreset } from "./factories/dialog";

/** Dialog roles: a `background/80` scrim blurred `sm` on the `overlay` layer; a `surface` panel with the `border` colour, `lg` radius and `lg` shadow on the `modal` layer; both fade in `fast` on the `standard` easing. */
export const dialogPreset = {
  scrim: "background/80",
  blur: "sm",
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "lg",
  shadow: "lg",
  overlayLayer: "overlay",
  modalLayer: "modal",
  duration: "fast",
  easing: "standard",
  type: { body: "text14Regular", title: "text16Medium" },
  text: "foreground",
  description: "muted",
} as const satisfies DialogPreset;

/** `dialogRecipe({ slot, size })` → the class of one dialog part (`overlay`, `content`, `title`, `description`). */
export const dialogRecipe = createDialogRecipe(tokens, dialogPreset);
