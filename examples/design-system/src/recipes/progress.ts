import { tokens } from "../tokens";

import { intents } from "./button";
import {
  createProgressRecipe,
  type ProgressPreset,
} from "./factories/progress";

/** Progress roles: the button intents on a `border`-coloured `pill` track; the indicator moves in `slow` time. */
export const progressPreset = {
  intents,
  track: "border",
  radius: "pill",
  duration: "slow",
  easing: "standard",
} as const satisfies ProgressPreset;

/** `progressRecipe({ slot, color, size })` → class string. */
export const progressRecipe = createProgressRecipe(tokens, progressPreset);
