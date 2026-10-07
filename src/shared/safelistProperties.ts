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

/**
 * Class prefixes of the `borderWidth` category. `border-s`/`border-e` are the
 * logical-side utilities and `divide-x`/`divide-y` the divider utilities; all
 * of them resolve `--border-width-*` in Tailwind, so `@source inline` covers a
 * dynamically built `border-s-thin` or `divide-x-thin`. Append-only: the order
 * is the order of the generated `@source inline` line.
 */
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

export const roundedProperties: string[] = [...ROUNDED_PREFIXES];

export const borderProperties: string[] = [...BORDER_PREFIXES];
