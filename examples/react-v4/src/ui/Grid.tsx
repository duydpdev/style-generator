import {
  createBoxRecipe,
  createCn,
  createGridRecipe,
  gridColumns,
  type FlexAlign,
  type FlexJustify,
  type RecipeTokens,
} from "design-system-example/recipes";
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ElementType,
  JSX,
} from "react";

import { mergeStyle, splitLayout, type LayoutProps } from "./layout";

/** Own props `P` win over the props of the rendered element `T`; `as` picks `T`. */
type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;

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
    const split = splitLayout(props, layout, spacingKeys);
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
