import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

import { toggleTables, type TogglePreset } from "./checkbox";

/** The tokens the slider reads: the recipe tokens plus the `controlHeight` keys. */
export interface SliderTokens extends RecipeTokens {
  readonly controlHeight: readonly string[];
}

/** A styled native `<input type="range">`: `color` sets the accent colour, `size` the height of the hit area (`h-control-*`). */
export const sliderTables = (t: SliderTokens, preset: TogglePreset) =>
  toggleTables(
    "block w-full",
    createVariantMapper("h-control", t.controlHeight),
    preset,
  );

export const createSliderRecipe = (t: SliderTokens, preset: TogglePreset) =>
  recipeFromTables(sliderTables(t, preset));
