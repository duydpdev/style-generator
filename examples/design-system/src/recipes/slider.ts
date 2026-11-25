import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import { createSliderRecipe } from "./factories/slider";
import type { TogglePreset } from "./factories/checkbox";

/** Slider roles: the checkbox roles with one `controlHeight` key per size. */
export const sliderPreset = {
  ...checkboxPreset,
  size: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies TogglePreset;

/** `sliderRecipe({ color, size })` → class string. */
export const sliderRecipe = createSliderRecipe(tokens, sliderPreset);
