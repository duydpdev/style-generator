import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface ContainerDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly layout: BodyRecipe;
  readonly container: BodyRecipe;
}
