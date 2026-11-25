import type { ComponentPropsWithRef } from "react";

/** Name the menu with `aria-label` or `aria-labelledby` (its trigger). */
export type MenuContentProps = Readonly<
  Omit<ComponentPropsWithRef<"div">, "role">
>;

export type MenuItemProps = Readonly<
  Omit<ComponentPropsWithRef<"button">, "role" | "type" | "tabIndex">
>;

export type MenuSeparatorProps = Readonly<
  Omit<ComponentPropsWithRef<"div">, "role" | "children">
>;
