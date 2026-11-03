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

import { LAYOUT_SIZE_KEYS, type LayoutProps } from "./layout";

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
