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
  createStackRecipe,
  type FlexAlign,
  type FlexJustify,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX } from "react";

import { LAYOUT_SIZE_KEYS, type ColorValue, type LayoutProps } from "./layout";

type StackOwnProps<W extends RecipeTokens> = LayoutProps<W> & {
  readonly direction?: "row" | "column" | undefined;
  readonly align?: FlexAlign | undefined;
  readonly justify?: FlexJustify | undefined;
  readonly wrap?: boolean | undefined;
  readonly divideColor?: ColorValue<W> | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Stack`: one vertical column (a column by default). */
export const createStack = <W extends RecipeTokens>(tokens: W) => {
  const cn = createCn(tokens);
  const layout = createBoxRecipe(tokens);
  const flex = createStackRecipe(tokens);
  const spacingKeys = tokens.spacingProperties;
  return function Stack<T extends ElementType = "div">({
    as,
    className,
    style,
    direction = "column",
    align,
    justify,
    wrap,
    divideColor,
    ...props
  }: Polymorphic<T, StackOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "div";
    const split = splitLayout(
      props,
      layout,
      spacingKeys,
      BOX_VARIANT_KEYS,
      LAYOUT_SIZE_KEYS,
    );
    return (
      <Component
        {...split.rest}
        className={
          cn(
            flex({ direction, align, justify, wrap, divideColor }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
