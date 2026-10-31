import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface ListDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly layout: RecipeFn;
  readonly list: RecipeFn;
}
