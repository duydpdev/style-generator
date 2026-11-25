/**
 * One interactive state a flat color token can opt into: the sibling key is
 * the token plus `suffix` (`primary` + `Hover` → `primaryHover`), and its
 * class is chained behind the Tailwind `variant` (`hover:bg-primary-hover`).
 */
export interface ColorState {
  readonly suffix: string;
  readonly variant: string;
}

/**
 * The interactive states a flat color token can opt into by declaring a
 * sibling key (`primary` + `primaryHover` -> `hover:bg-primary-hover`,
 * `primarySelected` -> `aria-selected:bg-primary-selected`).
 *
 * Single source of truth for BOTH sides of the contract: the registry's
 * `colorsCategory.states` (which drives the `@source inline` state lines) and
 * consumers passing `{ states: COLOR_STATES }` to `createVariantMapper`.
 * Kept in its own dependency-free module so the browser-safe `./cva`
 * subpath can re-export it without pulling Zod or the registry.
 */
export const COLOR_STATES = [
  { suffix: "Hover", variant: "hover" },
  { suffix: "Active", variant: "active" },
  { suffix: "Selected", variant: "aria-selected" },
] as const satisfies readonly ColorState[];
