import { toKebabCase } from "../../shared/helpers";

/**
 * Flatten a record of key-value pairs into CSS variable declarations.
 * @param {string} prefix - Variable prefix (e.g., "color")
 * @param {Record<string, string | Record<string, string>>} data - Key-value pairs
 * @returns {Record<string, string>} CSS variable map (e.g., { "--color-primary": "#007AFF" })
 */
export const flattenToVars = (
  prefix: string,
  data: Record<string, string | Record<string, string>>,
): Record<string, string> => {
  const result: Record<string, string> = {};

  const processNode = (
    node: Record<string, string | Record<string, string>>,
    currentPath: string[],
  ) => {
    for (const [key, value] of Object.entries(node)) {
      // If DEFAULT, we don't append it to the path
      const pathPart = key === "DEFAULT" ? [] : [toKebabCase(key)];
      const fullPath = [...currentPath, ...pathPart];

      if (typeof value === "string") {
        const varName = fullPath.length > 0 ? fullPath.join("-") : "";
        result[`--${prefix}-${varName}`] = value;
      } else {
        processNode(value, fullPath);
      }
    }
  };

  processNode(data, []);
  return result;
};

/**
 * Convert a record of key-value pairs into Tailwind-compatible var() references.
 * @param {string} prefix - Variable prefix (e.g., "color")
 * @param {Record<string, string | Record<string, string>>} data - Key-value pairs
 * @returns {Record<string, string | Record<string, string>>} Tailwind color map (e.g., { "primary": "var(--color-primary)" })
 */
export const mapToVarRefs = (
  prefix: string,
  data: Record<string, string | Record<string, string>>,
): Record<string, string | Record<string, string>> => {
  const processNode = (
    node: Record<string, string | Record<string, string>>,
    currentPath: string[],
  ): Record<string, string | Record<string, string>> => {
    const result: Record<string, string | Record<string, string>> = {};

    for (const [key, value] of Object.entries(node)) {
      const pathPart = key === "DEFAULT" ? [] : [toKebabCase(key)];
      const fullPath = [...currentPath, ...pathPart];

      if (typeof value === "string") {
        const varName = fullPath.length > 0 ? fullPath.join("-") : "";
        const finalKey = key === "DEFAULT" ? key : toKebabCase(key);
        result[finalKey] = `var(--${prefix}-${varName})`;
      } else {
        const finalKey = toKebabCase(key);
        result[finalKey] = processNode(value, fullPath) as Record<
          string,
          string
        >;
      }
    }
    return result;
  };

  return processNode(data, []);
};
