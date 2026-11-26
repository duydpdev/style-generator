import { toKebabCase } from "./helpers";

/**
 * The DOM attribute that activates a `themeAxes` axis, shared by the CSS generator and the `./recipes` helper.
 * @param {string} axis - Raw axis name as declared in `themeAxes`
 * @returns {string} `data-<axis-kebab>`, without brackets
 * Rationale: documents/architecture.md#axisattributename-why-it-has-its-own-module
 */
export const axisAttributeName = (axis: string): string =>
  `data-${toKebabCase(axis)}`;
