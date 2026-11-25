import type { JSX, KeyboardEvent } from "react";

import { cn } from "../../theme";

import { menuRecipe } from "./style";
import type {
  MenuContentProps,
  MenuItemProps,
  MenuSeparatorProps,
} from "./types";

/**
 * `MenuContent`: a `role="menu"` panel on the `modal` layer. ArrowDown/ArrowUp (wrapping),
 * Home and End move the focus between its enabled items; opening it, moving the focus to the
 * first item, closing it on `Escape` or a choice, and its position belong to the app.
 */
export function MenuContent({
  className,
  onKeyDown,
  ...rest
}: MenuContentProps): JSX.Element {
  const moveFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not(:disabled)',
      ),
    );
    const last = items.length - 1;
    const index = items.findIndex(
      (item) => item === event.currentTarget.ownerDocument.activeElement,
    );
    const target = {
      ArrowDown: index >= last ? 0 : index + 1,
      ArrowUp: index <= 0 ? last : index - 1,
      Home: 0,
      End: last,
    }[event.key];
    if (target === undefined || last < 0) return;
    event.preventDefault();
    items[target]?.focus();
  };
  return (
    <div
      {...rest}
      role="menu"
      onKeyDown={moveFocus}
      className={cn(menuRecipe({ slot: "content" }), className) || undefined}
    />
  );
}

/** `MenuItem`: a `role="menuitem"` button, out of the tab order; hover and focus share one fill. */
export function MenuItem({ className, ...rest }: MenuItemProps): JSX.Element {
  return (
    <button
      {...rest}
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={cn(menuRecipe({ slot: "item" }), className) || undefined}
    />
  );
}

/** `MenuSeparator`: a `role="separator"` rule between groups of items. */
export function MenuSeparator({
  className,
  ...rest
}: MenuSeparatorProps): JSX.Element {
  return (
    <div
      {...rest}
      role="separator"
      className={cn(menuRecipe({ slot: "separator" }), className) || undefined}
    />
  );
}
