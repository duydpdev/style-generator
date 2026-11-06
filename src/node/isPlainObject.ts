/**
 * Whether `value` is a non-null, non-array object (a parsed JSON object).
 * @param {unknown} value - The value to test
 * @returns {boolean} `true` for `{}` and `Object.create(null)`, `false` for `null`, arrays and primitives
 */
export const isPlainObject = (
  value: unknown,
): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
