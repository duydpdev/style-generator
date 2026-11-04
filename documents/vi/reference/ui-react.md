<!-- source: documents/reference/ui-react.md sha256: 7ea32886a96c -->

# Kiểu React (./ui-react)

Các helper React thuần kiểu (type-only) dành cho các component được dựng bằng [`./ui`](./ui.md). Module JS là rỗng; các khai báo import các kiểu của `react`, vì vậy hãy cài đặt `@types/react` 18 hoặc 19 (một peer dependency tùy chọn).

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

- `Polymorphic` nhận `ComponentPropsWithRef` của element. Trong React 19, `ref` là một prop thông thường và không cần `forwardRef`; trong React 18, một function component vẫn nhận `ref` qua `forwardRef`.
