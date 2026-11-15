import type { ColorVariant } from "@duydpdev/style-generator/types";

import themeJson from "./theme.json";
import { tokens } from "./theme.tokens";

/** The theme's literal type — feeds `ColorVariant<Theme>`, `ThemeAxesState<Theme>`, … */
export type Theme = typeof themeJson;

export const theme = themeJson;

/** Browser-safe typed token arrays, generated from `theme.json` + `style-gen.config.json` into `./theme.tokens.ts` (commit it). */
export { tokens };

/** A color token key, or `key/step` with a step from `coverage.colors.opacities`. */
export type ColorValue =
  | ColorVariant<Theme>
  | `${ColorVariant<Theme>}/${(typeof tokens)["opacities"][number]}`;
