import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface FlexDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly layout: RecipeFn;
  readonly stack: RecipeFn;
}
