import { mergeStyle, splitLayout } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import {
  BOX_OVERLAY_KEYS,
  BOX_SIZE_KEYS,
  BOX_VARIANT_KEYS,
  boxRecipe,
} from "./style";
import type { BoxProps } from "./types";

/** `Box`: token, size and spacing props, optional inner border. */
export function Box<T extends ElementType = "div">({
  as,
  className,
  style,
  innerBorder,
  position,
  children,
  ...props
}: BoxProps<T>): JSX.Element {
  const Component: ElementType = as ?? "div";
  const framed = innerBorder === true;
  const pos = position ?? (framed ? "relative" : undefined);
  const split = splitLayout(
    props,
    boxRecipe,
    tokens.spacingProperties,
    BOX_VARIANT_KEYS,
    BOX_SIZE_KEYS,
    {
      ...(pos === undefined ? {} : { position: pos }),
      ...(framed ? { innerBorder: true } : {}),
    },
  );
  const overlay = Object.fromEntries(
    BOX_OVERLAY_KEYS.map((key) => [key, split.variants[key]]),
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
            boxRecipe({ ...overlay, overlay: true, position: "absolute" }),
          )}
        />
      )}
    </Component>
  );
}
