import { tokens } from "../tokens";

import { checkboxPreset } from "./checkbox";
import { createRadioRecipe } from "./factories/radio";

/** A radio has the checkbox roles. */
export const radioPreset = checkboxPreset;

/** `radioRecipe({ color, size })` → class string. */
export const radioRecipe = createRadioRecipe(tokens, radioPreset);
