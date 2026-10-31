import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface CodeDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly code: BodyRecipe;
  readonly defaults: { readonly type?: string | undefined };
}
