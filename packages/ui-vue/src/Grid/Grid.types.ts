import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface GridDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly layout: RecipeFn;
  readonly grid: RecipeFn;
}
