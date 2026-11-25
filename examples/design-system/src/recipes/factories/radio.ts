import { recipeFromTables } from "@duydpdev/style-generator/ui";

import {
  checkboxTables,
  type TogglePreset,
  type ToggleTokens,
} from "./checkbox";

/** A native radio has the checkbox tables: `color` sets the accent colour, `size` the circle (`size-icon-*`). */
export const radioTables = checkboxTables;

export const createRadioRecipe = (t: ToggleTokens, preset: TogglePreset) =>
  recipeFromTables(radioTables(t, preset));
