import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface CardDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly card: RecipeFn;
}
