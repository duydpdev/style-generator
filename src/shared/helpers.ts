/**
 * Converts a camelCase token key to the kebab-case used in class names and CSS variables: `"blue500"` → `"blue-500"`, `"primaryFG"` → `"primary-fg"`, `"2xl"` → `"2xl"`.
 * @param {string} str - A camelCase token key
 * @returns {string} The kebab-case form of `str`
 */
export const toKebabCase = (str: string) => {
  return str
    .replaceAll(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll(/(\d)([A-Z])/g, "$1-$2")
    .replaceAll(/([A-Za-z])(\d)/g, "$1-$2")
    .toLowerCase();
};

export const toCamelCase = (str: string) => {
  return str
    .replaceAll(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c: string) => c.toLowerCase());
};

/** A valid Tailwind v4 `@utility` name, shared by `generateTypographyCss` and `themeSchema` so both reject the same keys. */
export const UTILITY_NAME_RE = /^[a-z][a-z0-9-]*$/;
