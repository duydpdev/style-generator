import { toKebabCase } from "./helpers";

/**
 * Flatten a record of key-value pairs into CSS variable declarations.
 * @param {string} prefix - Variable prefix (e.g., "color-base")
 * @param {Record<string, string>} data - Key-value pairs
 * @returns {Record<string, string>} CSS variable map (e.g., { "--color-base-primary": "#007AFF" })
 */
export const flattenToVars = (
  prefix: string,
  data: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(data)) {
    result[`--${prefix}-${toKebabCase(key)}`] = value;
  }
  return result;
};

/**
 * Convert a record of key-value pairs into Tailwind-compatible var() references.
 * @param {string} prefix - Variable prefix (e.g., "color-base")
 * @param {Record<string, string>} data - Key-value pairs
 * @returns {Record<string, string>} Tailwind color map (e.g., { "primary": "var(--color-base-primary)" })
 */
export const mapToVarRefs = (
  prefix: string,
  data: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of Object.keys(data)) {
    result[toKebabCase(key)] = `var(--${prefix}-${toKebabCase(key)})`;
  }
  return result;
};
