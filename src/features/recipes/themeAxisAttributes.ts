import type { ThemeAxesState } from "../../core/designTokensTypes";
import type { ThemeConfig } from "../../core/themeSchema";
import { axisAttributeName } from "../../shared/axisAttributeName";
import { toKebabCase } from "../../shared/helpers";

/**
 * The DOM attributes that activate a theme's axis variants, mirroring the
 * `html[data-<axis>="<variant>"]` selectors `generate()` emits. Spread the
 * result on the element the selectors target (`<html>` by default):
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
 * @param {object} [options] - Optional settings
 * @param {Readonly<Record<string, string>>} [options.attribute] - Axis name → attribute name; the same object as `options.axes.attribute` of `generate()`
 * @returns {Readonly<Record<string, string>>} Attribute name → kebab-cased variant
 */
export const themeAxisAttributes = <T extends ThemeConfig>(
  state: ThemeAxesState<T>,
  options?: {
    readonly attribute?: Readonly<Record<string, string>> | undefined;
  },
): Readonly<Record<string, string>> => {
  const attributes: Record<string, string> = {};
  for (const [axis, variant] of Object.entries(
    state as Record<string, string | undefined>,
  )) {
    if (variant === undefined || variant === "base") continue;
    attributes[axisAttributeName(axis, options?.attribute)] =
      toKebabCase(variant);
  }
  return attributes;
};
