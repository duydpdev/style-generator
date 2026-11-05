import { tokens } from "../tokens";

import { createGridRecipe, type GridRows } from "./factories/grid";
import type { FlexAlign, FlexJustify } from "./factories/stack";

/** Props of the bound grid recipe (columns: `gridColumns` from `design-system-example/recipes`). */
export type GridRecipeProps = Readonly<{
  align?: FlexAlign | null | undefined;
  justify?: FlexJustify | null | undefined;
  flow?: "row" | "column" | "dense" | null | undefined;
  rows?: GridRows | null | undefined;
}>;

/** Headless grid recipe: `gridRecipe({ align, justify, flow, rows })`. */
export const gridRecipe: (props?: GridRecipeProps) => string =
  createGridRecipe(tokens);
