import { axisAttributeName } from "../../shared/axisAttributeName";
import { toKebabCase } from "../../shared/helpers";

/**
 * The DOM attributes that activate a theme's axis variants, mirroring the
 * `html[data-<axis>="<variant>"]` selectors `generate()` emits. Spread the
 * result on `<html>`, the element the selectors target. Type the state with
 * `ThemeAxesState` from the generated `theme.tokens.ts`:
 * ```tsx
 * import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
 *
 * import type { ThemeAxesState } from "~/theme/theme.tokens";
 *
 * const state: ThemeAxesState = { theme: "dark", palette: "base" };
 * const root = <html {...themeAxisAttributes(state)} />;
 * // → data-theme="dark" (palette emits nothing)
 * ```
 * An axis that is `"base"` or `undefined` produces **no** attribute, so no
 * override block matches and the `:root` values apply. React removes a prop
 * that disappears between renders; an imperative caller must
 * `removeAttribute(...)` for an axis it omits.
 * @param {Readonly<Record<string, string | undefined>>} state - Active variant per axis (raw names)
 * @returns {Readonly<Record<string, string>>} Attribute name → kebab-cased variant
 */
export const themeAxisAttributes = (
  state: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string>> => {
  const attributes: Record<string, string> = {};
  for (const [axis, variant] of Object.entries(state)) {
    if (variant === undefined || variant === "base") continue;
    attributes[axisAttributeName(axis)] = toKebabCase(variant);
  }
  return attributes;
};
