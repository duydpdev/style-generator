import { toKebabCase } from "../../shared/helpers";

/**
 * Flatten a flat record of key-value pairs into CSS variable declarations.
 * @param {string} prefix - Variable prefix (e.g., "color")
 * @param {Record<string, string>} data - Flat key-value pairs
 * @returns {Record<string, string>} CSS variable map (e.g., { "--color-primary": "#007AFF" })
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
 * Convert a flat record of key-value pairs into Tailwind-compatible var() references.
 * @param {string} prefix - Variable prefix (e.g., "color")
 * @param {Record<string, string>} data - Flat key-value pairs
 * @returns {Record<string, string>} Tailwind color map (e.g., { "primary": "var(--color-primary)" })
 */
export const mapToVarRefs = (
  prefix: string,
  data: Record<string, string>,
): Record<string, string> => {
  const result: Record<string, string> = {};
  for (const key of Object.keys(data)) {
    const kebabKey = toKebabCase(key);
    result[kebabKey] = `var(--${prefix}-${kebabKey})`;
  }
  return result;
};
