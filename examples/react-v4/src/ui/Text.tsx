import {
  createCn,
  createTextRecipe,
  type RecipeTokens,
  type TextPreset,
} from "design-system-example/recipes";
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ElementType,
  JSX,
} from "react";

import { mergeStyle, splitSpacing, type ThemeSpacingProps } from "./layout";

/** Own props `P` win over the props of the rendered element `T`; `as` picks `T`. */
type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: W["colors"][number] | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography/color/align/decoration from the text recipe, preset defaults, spacing props. */
export const createText = <W extends RecipeTokens>(
  tokens: W,
  preset?: TextPreset,
) => {
  const cn = createCn(tokens);
  const text = createTextRecipe(tokens, preset);
  const spacingKeys = tokens.spacingProperties;
  return function Text<T extends ElementType = "p">({
    as,
    className,
    style,
    type = preset?.defaultType,
    color = preset?.defaultColor,
    align,
    decoration,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({ type, color, align, decoration }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
