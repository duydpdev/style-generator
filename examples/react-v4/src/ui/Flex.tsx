import {
  createBoxRecipe,
  createCn,
  createStackRecipe,
  type FlexAlign,
  type FlexJustify,
  type RecipeTokens,
} from "design-system-example/recipes";
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

type FlexOwnProps<W extends RecipeTokens> = LayoutProps<W> & {
  readonly direction?: "row" | "column" | undefined;
  readonly align?: FlexAlign | undefined;
  readonly justify?: FlexJustify | undefined;
  readonly wrap?: boolean | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Flex`: a row of two or more items (a row by default). */
export const createFlex = <W extends RecipeTokens>(tokens: W) => {
  const cn = createCn(tokens);
  const layout = createBoxRecipe(tokens);
  const flex = createStackRecipe();
  const spacingKeys = tokens.spacingProperties;
  return function Flex<T extends ElementType = "div">({
    as,
    className,
    style,
    direction = "row",
    align,
    justify,
    wrap,
    ...props
  }: Polymorphic<T, FlexOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "div";
    const split = splitLayout(props, layout, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            flex({ direction, align, justify, wrap }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
