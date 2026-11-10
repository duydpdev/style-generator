import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import {
  Fragment,
  isValidElement,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/**
 * An icon slot is a flex box so an inline-level icon (an inline-block wrapper,
 * `<iconify-icon>`) is centred instead of sitting on the 24px line box's baseline.
 * `empty:hidden` drops a slot whose content rendered nothing, so it takes no `gap`.
 */
const ICON_SLOT = "flex shrink-0 items-center empty:hidden";

/**
 * Whether a slot renders something, matching `Button.vue`: not `null`/`undefined`, a
 * boolean (`{open && "Label"}`), blank text, or an array/fragment holding only such entries.
 */
const present = (node: ReactNode): boolean => {
  if (Array.isArray(node)) return node.some(present);
  if (node == null || typeof node === "boolean") return false;
  if (typeof node === "string") return node.trim() !== "";
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment)
    return present(node.props.children);
  return true;
};

/**
 * `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed.
 * An icon-only button passes the icon as `prefix` (or `suffix`) with no label and an `aria-label`:
 * no label span is rendered, so `gap` cannot push the icon off centre, and the button is square.
 */
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
  const iconOnly = !present(children) && present(prefix) !== present(suffix);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      className={
        cn(
          buttonRecipe({ variant, color, size, iconOnly }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {present(prefix) && <span className={ICON_SLOT}>{prefix}</span>}
      {present(children) && <span className="empty:hidden">{children}</span>}
      {present(suffix) && <span className={ICON_SLOT}>{suffix}</span>}
    </Component>
  );
}
