import {
  createBoxRecipe,
  createCn,
  type BoxPreset,
  type RecipeTokens,
} from "design-system-example/recipes";
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ElementType,
  JSX,
  ReactNode,
} from "react";

import { mergeStyle, splitLayout, type LayoutProps } from "./layout";

/** Own props `P` win over the props of the rendered element `T`; `as` picks `T`. */
type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;

type BoxOwnProps<W extends RecipeTokens> = LayoutProps<W> & {
  /** A 1px frame drawn by an overlay span instead of the element's border. */
  readonly innerBorder?: boolean | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly children?: ReactNode;
};

const OVERLAY_KEYS = [
  "borderColor",
  "border",
  "borderX",
  "borderY",
  "borderT",
  "borderB",
  "borderL",
  "borderR",
  "rounded",
  "roundedT",
  "roundedB",
  "roundedL",
  "roundedR",
] as const;

/** `Box`: box recipe (+ `preset.base`), token, size and spacing props, optional inner border. */
export const createBox = <W extends RecipeTokens>(
  tokens: W,
  preset?: BoxPreset,
) => {
  const cn = createCn(tokens);
  const box = createBoxRecipe(tokens, preset);
  const spacingKeys = tokens.spacingProperties;
  return function Box<T extends ElementType = "div">({
    as,
    className,
    style,
    innerBorder,
    position,
    children,
    ...props
  }: Polymorphic<T, BoxOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "div";
    const framed = innerBorder === true;
    const pos = position ?? (framed ? "relative" : undefined);
    const split = splitLayout(props, box, spacingKeys, {
      ...(pos === undefined ? {} : { position: pos }),
      ...(framed ? { innerBorder: true } : {}),
    });
    const overlay = Object.fromEntries(
      OVERLAY_KEYS.map((key) => [key, split.variants[key]]),
    );
    return (
      <Component
        {...split.rest}
        className={cn(split.className, className) || undefined}
        style={mergeStyle(split.style, style)}
      >
        {children}
        {framed && (
          <span
            aria-hidden="true"
            className={cn(
              box({ ...overlay, overlay: true, position: "absolute" }),
            )}
          />
        )}
      </Component>
    );
  };
};
