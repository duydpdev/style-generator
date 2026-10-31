import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface BadgeDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly badge: RecipeFn;
}
