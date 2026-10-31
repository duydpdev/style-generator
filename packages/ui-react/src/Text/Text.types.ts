import type { UiCn } from "../shared/cn";
import type { BodyRecipe } from "../shared/splitStyleProps";

export interface TextDeps {
  readonly cn: UiCn;
  readonly spacing: readonly string[];
  readonly text: BodyRecipe;
  readonly defaults: {
    readonly type?: string | undefined;
    readonly color?: string | undefined;
  };
}
