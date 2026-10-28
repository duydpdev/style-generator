import { toKebabCase } from "./helpers";

/**
 * The DOM attribute that activates a `themeAxes` axis: the consumer's
 * `axes.attribute[axis]` when one is set, else `data-<axis-kebab>`. Shared by
 * the CSS generator (the emitted selector) and the `./recipes` DOM helper so
 * the two can never disagree about an attribute name. Lives in its own module
 * (not `helpers.ts`) so the shared `helpers` chunk that `./tokens` and `./cva`
 * import does not grow.
 * @param {string} axis - Raw axis name as declared in `themeAxes`
 * @param {Readonly<Record<string, string>>} [attribute] - `axes.attribute` map: axis name → attribute name
 * @returns {string} The attribute name (no brackets)
 */
export const axisAttributeName = (
  axis: string,
  attribute?: Readonly<Record<string, string>>,
): string =>
  (attribute !== undefined && Object.hasOwn(attribute, axis)
    ? attribute[axis]
    : undefined) ?? `data-${toKebabCase(axis)}`;
