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

export const toPascalCase = (str: string) => {
  return str
    .replaceAll(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
    .replace(/^(.)/, (_, c: string) => c.toUpperCase());
};

/**
 * Tailwind v4 `@utility` names must be a single CSS-ident-safe lowercase
 * token: start with a lowercase letter, then any run of lowercase
 * letters/digits/dashes. A kebab-cased key that starts with a digit
 * (e.g. a top-level `"2xl"` key) or a dash cannot be registered.
 *
 * Single source of truth shared by `generateTypographyCss` (runtime CSS
 * emission) and `themeSchema` (parse-time validation) so both reject the
 * same set of typography keys.
 */
export const UTILITY_NAME_RE = /^[a-z][a-z0-9-]*$/;
