import { tokens } from "../tokens";

import { intents } from "./button";
import { createSpinnerRecipe, type SpinnerPreset } from "./factories/spinner";

/** Spinner roles: the button intents, a `thick` `pill` ring, one `iconSize` key per size. */
export const spinnerPreset = {
  intents,
  borderWidth: "thick",
  radius: "pill",
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies SpinnerPreset;

/** `spinnerRecipe({ color, size })` → class string. */
export const spinnerRecipe = createSpinnerRecipe(tokens, spinnerPreset);
