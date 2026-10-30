import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface ListDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly layout: BodyRecipe;
  readonly list: BodyRecipe;
}
