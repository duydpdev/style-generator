import type {
  ComponentPropsWithRef,
  CSSProperties,
  ElementType,
  JSX,
  ReactNode,
} from "react";

/** Own props `P` plus the props of the rendered element `T` (own props win); `as` picks `T`. */
export type PolymorphicProps<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;

/** A component whose root element is `as` (default `D`); React 19 `ref` is a normal prop. */
export type PolymorphicComponent<D extends ElementType, P extends object> = <
  T extends ElementType = D,
>(
  props: PolymorphicProps<T, P>,
) => JSX.Element | null;

/** What a component body receives: untyped on purpose (the typed surface is `Ui`). */
export interface LooseProps {
  readonly as?: ElementType | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly children?: ReactNode;
  readonly [prop: string]: unknown;
}
