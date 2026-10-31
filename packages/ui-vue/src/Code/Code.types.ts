import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface CodeDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly code: RecipeFn;
  readonly defaults: { readonly type?: string | undefined };
}
