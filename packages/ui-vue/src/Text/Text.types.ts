import type { Cn, RecipeFn } from "design-system-example/recipes";

export interface TextDeps {
  readonly cn: Cn;
  readonly spacing: readonly string[];
  readonly text: RecipeFn;
  readonly defaults: {
    readonly type?: string | undefined;
    readonly color?: string | undefined;
  };
}
