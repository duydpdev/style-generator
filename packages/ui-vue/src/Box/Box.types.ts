import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface BoxDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly box: RecipeFn;
}
