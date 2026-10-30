import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface ButtonDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly button: RecipeFn;
}
