import { toKebabCase } from "./helpers";

/**
 * The DOM attribute that activates a `themeAxes` axis: `data-<axis-kebab>`.
 * Shared by the CSS generator (the emitted selector) and the `./recipes` DOM
 * helper so the two can never disagree about an attribute name. Lives in its
 * own module (not `helpers.ts`) so the shared `helpers` chunk that `./tokens`
 * and `./cva` import does not grow.
 * @param {string} axis - Raw axis name as declared in `themeAxes`
 * @returns {string} The attribute name (no brackets)
 */
export const axisAttributeName = (axis: string): string =>
  `data-${toKebabCase(axis)}`;
