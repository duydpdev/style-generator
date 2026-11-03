# React types (./ui-react)

Type-only React helpers for components built with [`./ui`](./ui.md). The JS module is empty; the declarations import `react` types, so install `@types/react` 18 or 19 (an optional peer dependency).

```tsx
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { ElementType, ReactNode } from "react";

interface LinkOwnProps {
  readonly tone?: "plain" | "loud" | undefined;
  readonly children?: ReactNode;
}

export type LinkProps<T extends ElementType = "a"> = Polymorphic<
  T,
  LinkOwnProps
>;

export function Link<T extends ElementType = "a">({
  as,
  tone,
  ...rest
}: LinkProps<T>) {
  const Component: ElementType = as ?? "a";
  return <Component data-tone={tone} {...rest} />;
}
// <Link href="/docs">Docs</Link>, <Link as="button" type="submit">Send</Link>
```

## `Polymorphic`

<!-- signature: Polymorphic -->

```ts
export declare type Polymorphic<T extends ElementType, P extends object> = P & {
  readonly as?: T | undefined;
} & Omit<ComponentPropsWithRef<T>, keyof P | "as">;
```

Props of a polymorphic React component: its own props `P` win over
the props of the rendered element `T`, and `as` picks `T`.

<!-- /signature -->

- `Polymorphic` takes the element's `ComponentPropsWithRef`. In React 19 `ref` is a normal prop and needs no `forwardRef`; in React 18 a function component still receives `ref` through `forwardRef`.
