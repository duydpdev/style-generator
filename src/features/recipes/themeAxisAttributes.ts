import type { ThemeAxesState } from "../../core/designTokensTypes";
import type { ThemeConfig } from "../../core/themeSchema";
import { axisAttributeName } from "../../shared/axisAttributeName";
import { toKebabCase } from "../../shared/helpers";

/**
 * The DOM attributes that activate a theme's axis variants, mirroring the
 * `html[data-<axis>="<variant>"]` selectors `generate()` emits. Spread the
 * result on `<html>`, the element the selectors target:
 * ```tsx
 * import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
 *
 * const root = (
 *   <html {...themeAxisAttributes({ theme: "dark", palette: "base" })} />
 * );
 * // → data-theme="dark" (palette emits nothing)
 * ```
 * An axis that is `"base"` or `undefined` produces **no** attribute, so no
 * override block matches and the `:root` values apply. React removes a prop
 * that disappears between renders; an imperative caller must
 * `removeAttribute(...)` for an axis it omits.
 * @template T - ThemeConfig type (typically `typeof themeJson`)
 * @param {ThemeAxesState<T>} state - Active variant per axis (raw names)
 * @returns {Readonly<Record<string, string>>} Attribute name → kebab-cased variant
 */
export const themeAxisAttributes = <T extends ThemeConfig>(
  state: ThemeAxesState<T>,
): Readonly<Record<string, string>> => {
  const attributes: Record<string, string> = {};
  for (const [axis, variant] of Object.entries(
    state as Record<string, string | undefined>,
  )) {
    if (variant === undefined || variant === "base") continue;
    attributes[axisAttributeName(axis)] = toKebabCase(variant);
  }
  return attributes;
};
