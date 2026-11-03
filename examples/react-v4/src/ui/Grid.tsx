import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import {
  createCn,
  mergeStyle,
  splitLayout,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import {
  BOX_VARIANT_KEYS,
  createBoxRecipe,
  createGridRecipe,
  gridColumns,
  type FlexAlign,
  type FlexJustify,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX } from "react";

import { LAYOUT_SIZE_KEYS, type LayoutProps } from "./layout";

type GridOwnProps<W extends RecipeTokens> = LayoutProps<W> & {
  /** A count or a CSS track list (`"80px 1fr"`), per breakpoint. */
  readonly columns?:
    | ResponsiveValueStrict<number | string, W["breakpoints"][number]>
    | undefined;
  readonly align?: FlexAlign | undefined;
  readonly justify?: FlexJustify | undefined;
  readonly flow?: "row" | "column" | "dense" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Grid`: `columns` (count or track list per breakpoint) + grid alignment. */
export const createGrid = <W extends RecipeTokens>(tokens: W) => {
  const cn = createCn(tokens);
  const layout = createBoxRecipe(tokens);
  const grid = createGridRecipe(tokens);
  const spacingKeys = tokens.spacingProperties;
  return function Grid<T extends ElementType = "div">({
    as,
    className,
    style,
    columns,
    align,
    justify,
    flow,
    ...props
  }: Polymorphic<T, GridOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "div";
    const split = splitLayout(
      props,
      layout,
      spacingKeys,
      BOX_VARIANT_KEYS,
      LAYOUT_SIZE_KEYS,
    );
    const cols = columns === undefined ? undefined : gridColumns(columns);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            grid({ align, justify, flow }),
            cols?.className,
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, cols?.style, style)}
      />
    );
  };
};
