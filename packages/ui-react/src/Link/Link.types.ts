import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface LinkDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly link: BodyRecipe;
}
