import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/** `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed. */
export function Button<T extends ElementType = "button">({
  as,
  className,
  style,
  variant,
  color,
  size,
  prefix,
  suffix,
  children,
  ...props
}: ButtonProps<T>): JSX.Element {
  const Component: ElementType = as ?? "button";
  const split = splitSpacing(props, tokens.spacingProperties);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      data-slot="button"
      className={
        cn(
          buttonRecipe({ variant, color, size }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {prefix != null && <span data-icon="start">{prefix}</span>}
      <span>{children}</span>
      {suffix != null && <span data-icon="end">{suffix}</span>}
    </Component>
  );
}
