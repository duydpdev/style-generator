import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";

import type { ThemeAxesState } from "./theme.tokens";

/**
 * The DOM attributes that switch the theme's axes on, typed by `theme.json`:
 * `axisAttributes({ theme: "highContrast", palette: "forest" })` →
 * `{ "data-theme": "high-contrast", "data-palette": "forest" }`. `"base"` (or
 * an omitted axis) emits nothing. Spread on `<html>`, or pass to Nuxt's
 * `useHead({ htmlAttrs })`.
 */
export const axisAttributes = (
  state: ThemeAxesState,
): Readonly<Record<string, string>> => themeAxisAttributes(state);
