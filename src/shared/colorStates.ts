/** One interactive state: sibling key `<token><suffix>` (`primaryHover`), class behind `variant` (`hover:bg-primary-hover`). */
export interface ColorState {
  readonly suffix: string;
  readonly variant: string;
}

/** States a color token opts into via a sibling key; single source for the registry and `createVariantMapper`. Rationale: documents/architecture.md#colorstates-why-it-lives-in-a-dependency-free-module */
export const COLOR_STATES = [
  { suffix: "Hover", variant: "hover" },
  { suffix: "Active", variant: "active" },
  { suffix: "Selected", variant: "aria-selected" },
] as const satisfies readonly ColorState[];
