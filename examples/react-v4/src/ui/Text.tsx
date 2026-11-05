import {
  createCn,
  mergeStyle,
  splitSpacing,
  type RecipeTokens,
  type ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import {
  createTextRecipe,
  type TextPreset,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX } from "react";

import type { ColorValue } from "./layout";

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: ColorValue<W> | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly transform?:
    | "uppercase"
    | "lowercase"
    | "capitalize"
    | "normalCase"
    | undefined;
  readonly italic?: boolean | undefined;
  readonly truncate?: boolean | undefined;
  readonly lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none" | undefined;
  readonly wrap?: "wrap" | "nowrap" | "balance" | "pretty" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography, color (a token or `token/step`), align, decoration, transform, italic, truncate, line clamp, wrap from the text recipe, preset defaults, spacing props. */
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
    transform,
    italic,
    truncate,
    lineClamp,
    wrap,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({
              type,
              color,
              align,
              decoration,
              transform,
              italic,
              truncate,
              lineClamp,
              wrap,
            }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
