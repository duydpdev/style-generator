import type { ComponentPropsWithRef, ElementType } from "react";

/**
 * Props of a polymorphic React component: its own props `P` win over
 * the props of the rendered element `T`, and `as` picks `T`.
 * @template T - The rendered element or component (`"div"`, `"a"`, a component)
 * @template P - The component's own props
 */
export type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;
