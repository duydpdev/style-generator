import { tokens } from "../tokens";

import { createToastRecipe, type ToastPreset } from "./factories/toast";

/** Toast roles: a `surface` panel with the `border` colour, `lg` radius and `md` shadow; it enters in `fast` time on the `standard` easing. */
export const toastPreset = {
  surface: "surface",
  border: "border",
  borderWidth: "thin",
  radius: "lg",
  shadow: "md",
  duration: "fast",
  easing: "standard",
  type: { body: "text14Regular", title: "text16Medium" },
  title: "foreground",
  description: "muted",
} as const satisfies ToastPreset;

/** `toastRecipe({ slot })` → the class of one toast slot (`root`, `title`, `description`). */
export const toastRecipe = createToastRecipe(tokens, toastPreset);
