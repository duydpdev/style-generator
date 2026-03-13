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
    .replaceAll(/^(.)/, (_, c: string) => c.toUpperCase());
};

export const extractData = (data: Record<string, unknown>) => {
  return Object.entries(data).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[toKebabCase(key)] = value;
      return acc;
    },
    {},
  );
};

export const addDot = (data: Record<string, unknown>) => {
  return Object.entries(data).reduce<Record<string, unknown>>(
    (acc, [key, value]) => {
      acc[`.${toKebabCase(key)}`] = value;
      return acc;
    },
    {},
  );
};
