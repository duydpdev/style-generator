/**
 * Literal class prefixes of the rounded/border families — the single source
 * the registry descriptors (`as const`) and the public string arrays below
 * share.
 */
export const ROUNDED_PREFIXES = [
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
] as const;

export const BORDER_PREFIXES = [
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
] as const;

export const roundedProperties: string[] = [...ROUNDED_PREFIXES];

export const borderProperties: string[] = [...BORDER_PREFIXES];
