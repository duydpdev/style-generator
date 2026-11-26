import { toKebabCase } from "./helpers";

// Rationale: documents/architecture.md#axisattributename-why-it-has-its-own-module
/**
 * The DOM attribute that activates a `themeAxes` axis, shared by the CSS generator and the `./recipes` helper.
 * @param {string} axis - Raw axis name as declared in `themeAxes`
 * @returns {string} `data-<axis-kebab>`, without brackets
 */
export const axisAttributeName = (axis: string): string =>
  `data-${toKebabCase(axis)}`;
