import { axisAttributeName } from "../../shared/axisAttributeName";
import { toKebabCase } from "../../shared/helpers";

/**
 * The `data-<axis>` attributes that activate a theme's axis variants; spread
 * them on `<html>`, the element the generated selectors target. A `"base"` or
 * `undefined` axis yields no attribute; an imperative caller must remove it.
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
