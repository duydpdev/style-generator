/** Literal class prefixes of the rounded family, shared by the registry descriptors and `roundedProperties`. */
export const ROUNDED_PREFIXES = [
  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
] as const;

/** Class prefixes resolving `--border-width-*`. Append-only: the order is the order of the generated `@source inline` line. */
export const BORDER_PREFIXES = [
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "divide-x",
  "divide-y",
] as const;

/** Rounded class prefixes as a mutable array, typed so it passes `createVariantMapper(roundedProperties, keys)` as is. */
export const roundedProperties: (typeof ROUNDED_PREFIXES)[number][] = [
  ...ROUNDED_PREFIXES,
];

/** Border class prefixes (`border`, `border-x` … `divide-y`) as a mutable array, typed so it passes `createVariantMapper(borderProperties, keys)` as is. */
export const borderProperties: (typeof BORDER_PREFIXES)[number][] = [
  ...BORDER_PREFIXES,
];
