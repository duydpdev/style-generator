import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { options } from "./style-gen.options";
import themeJson from "./theme.json";

/** The theme's literal type — feeds `ColorVariant<Theme>`, `ThemeAxesState<Theme>`, … */
export type Theme = typeof themeJson;

export const theme = themeJson;

/** Browser-safe typed token arrays (one per category) derived from `theme.json` + `options`. */
export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;

/** A color token key, or `key/step` with a step from `coverage.colors.opacities`. */
export type ColorValue =
  | ColorVariant<Theme>
  | `${ColorVariant<Theme>}/${(typeof tokens)["opacities"][number]}`;
