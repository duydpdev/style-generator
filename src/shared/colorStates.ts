/**
 * Interactive state suffixes a flat color token can opt into by declaring a
 * sibling key (`primary` + `primaryHover` -> `hover:bg-primary-hover`).
 *
 * Single source of truth for BOTH sides of the contract: the registry's
 * `colorsCategory.states` (which drives the `@source inline` state lines) and
 * consumers passing `{ states: COLOR_STATES }` to `createVariantMapper`.
 * Kept in its own dependency-free module so the browser-safe `./tokens` and
 * `./cva` subpaths can re-export it without pulling Zod or the registry.
 */
export const COLOR_STATES = ["hover", "active"] as const;
