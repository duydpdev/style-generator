export const toKebabCase = (str: string) => {
  return str
    .replaceAll(/([a-z])([A-Z])/g, "$1-$2")
    .replaceAll(/(\d)([A-Za-z])/g, "$1-$2")
    .replaceAll(/([A-Za-z])(\d)/g, "$1-$2")
    .toLowerCase();
};

export const toCamelCase = (str: string) => {
  return str
    .replaceAll(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
    .replaceAll(/^(.)/, (_, c: string) => c.toLowerCase());
};

export const toPascalCase = (str: string) => {
  return str
    .replaceAll(/[-_\s]+(.)?/g, (_, c: string) => (c ? c.toUpperCase() : ""))
    .replaceAll(/^(.)/, (_, c: string) => c.toUpperCase());
};

export const extractData = (object: object, isToKebabCase = true) => {
  return Object.entries(object).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[isToKebabCase ? toKebabCase(key) : key] = value;
      return acc;
    },
    {},
  );
};

export const addDot = (object: object) => {
  return Object.entries(object).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[`.${toKebabCase(key)}`] = value;
      return acc;
    },
    {},
  );
};
