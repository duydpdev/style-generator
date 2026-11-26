<!-- source: documents/reference/spacing.md sha256: ed5b635d7d0b -->

# Spacing (./spacing)

Các helper an toàn cho trình duyệt (browser-safe) giúp biến các prop spacing thành class `sp-*` và các biến inline `--sg-sp-*` mà CSS được sinh ra đọc.

Các utility spacing được sinh ra một lần dưới dạng các block `@utility sp-<key>`; các component chỉ thiết lập các biến inline. Một biến `--sg-sp-<key>[-<breakpoint>]` được đăng ký với `@property … { syntax: "*"; inherits: false }`, và mỗi utility mang chuỗi giá trị dự phòng breakpoint của riêng nó:

```css
@utility sp-p {
  padding: var(--sg-sp-p);
  @media (width >= 768px) {
    padding: var(--sg-sp-p-md, var(--sg-sp-p));
  }
  @media (width >= 1024px) {
    padding: var(--sg-sp-p-lg, var(--sg-sp-p-md, var(--sg-sp-p)));
  }
}
```

Các key mặc định: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left` (`SpacingKey`). Vô hiệu hóa bằng `spacing: { enabled: false }`; tùy biến bằng `spacing: { properties: { inset: ["top", "bottom"] } }` (một key spacing → các thuộc tính CSS mà nó thiết lập).

## Sử dụng trong component

```tsx
import {
  splitSpacingProps,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";
import type { ComponentPropsWithoutRef } from "react";

import { tokens } from "./theme/theme.tokens";

type BoxProps = ComponentPropsWithoutRef<"div"> & SpacingProps;

const Box = ({ className, style, ...props }: BoxProps) => {
  const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
  return (
    <div
      {...rest}
      className={[spacing.className, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    />
  );
};

<Box p={4} />;
// → class="sp-p" style="--sg-sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />;
// → class="sp-p" style="--sg-sp-p: 0.5rem; --sg-sp-p-md: 1rem; --sg-sp-p-lg: 2rem"

<Box p={13.5} />;
// → class="sp-p" style="--sg-sp-p: 3.375rem"

<Box gap={{ base: 4, md: 8 }} gapX={2} />;
// → class="sp-gap sp-gap-x" (with the `--sg-sp-gap*` variables in `style`)
```

## Dùng tầng nào

| Tầng                | Subpath     | Dùng cho                                                                                                   |
| :------------------ | :---------- | :--------------------------------------------------------------------------------------------------------- |
| `resolveSpacing`    | `./spacing` | Một prop và giá trị → `{ className, style }`. Nguyên thủy mà các tầng khác gọi.                            |
| `splitSpacingProps` | `./recipes` | Props của component → `{ spacing, rest }`; kiểu theo `SpacingProps`, không phụ thuộc framework.            |
| `splitSpacing`      | `./ui`      | Cùng phép tách đó nhưng trả `{ className, style, rest }`, cho các component của bộ UI kit.                 |
| `splitLayout`       | `./ui`      | Component layout: spacing, variant của recipe và kích thước inline trong một lượt (xem [UI kit](./ui.md)). |

- `spacing.className` là một **chuỗi string** (nối bằng dấu cách), không phải một mảng.
- **Quy tắc cùng phần tử (same-element rule):** các biến không kế thừa, vì vậy class và các biến `style` phải nằm trên **cùng một phần tử**; biến `--sg-sp-p` của phần tử cha không bao giờ bị rò rỉ sang phần tử con.
- Chỉ các breakpoint được liệt kê trong `options.breakpoints` (mặc định `["md","lg"]`) mới có chuỗi giá trị dự phòng; một biến dành cho bất kỳ breakpoint nào khác sẽ không có tác dụng.
- `resolveSpacing(prop, value, unit?)` xử lý một prop đơn lẻ; `unit` mặc định là `0.25` (rem cho mỗi bước).
- Các giá trị responsive sử dụng `ResponsiveValueStrict<T, B>` (từ `./types`): một lỗi chính tả như `{ typo: 4 }` là lỗi kiểu, và `base` luôn luôn được cho phép. `B` mặc định là `md | lg`, các breakpoint mà CSS spacing mặc định bao phủ; với `options.breakpoints` tùy biến, hãy truyền cùng các key đó làm tham số kiểu (`resolveSpacing<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`).

## `resolveSpacing`

<!-- signature: resolveSpacing -->

```ts
export declare const resolveSpacing: <
  BKeys extends string = DefaultBreakpointKeys,
>(
  prop: SpacingKey | (string & {}),
  value: ResponsiveValueStrict<number, NoInferBKeys<BKeys>>,
  unit?: number,
) => {
  className: string;
  style: Record<string, string>;
};
```

Resolve a single spacing prop into className + inline style CSS variables.
Breakpoint keys default to the ones the spacing CSS emits (`md`/`lg`); pass
`BKeys` when `options.breakpoints` adds others. `BKeys` is never inferred
from the value ({@link NoInferBKeys}), so a typo such as `{ tablet: 4 }` stays an error.

<!-- /signature -->

Chuyển đổi một prop spacing thành một `className` và các biến `style` inline của nó.

## `DEFAULT_SPACING_PROPERTIES`

<!-- signature: DEFAULT_SPACING_PROPERTIES -->

```ts
export declare const DEFAULT_SPACING_PROPERTIES: {
  readonly p: readonly ["padding"];
  readonly px: readonly ["padding-left", "padding-right"];
  readonly py: readonly ["padding-top", "padding-bottom"];
  readonly pt: readonly ["padding-top"];
  readonly pb: readonly ["padding-bottom"];
  readonly pl: readonly ["padding-left"];
  readonly pr: readonly ["padding-right"];
  readonly m: readonly ["margin"];
  readonly mx: readonly ["margin-left", "margin-right"];
  readonly my: readonly ["margin-top", "margin-bottom"];
  readonly mt: readonly ["margin-top"];
  readonly mb: readonly ["margin-bottom"];
  readonly ml: readonly ["margin-left"];
  readonly mr: readonly ["margin-right"];
  readonly gap: readonly ["gap"];
  readonly "gap-x": readonly ["column-gap"];
  readonly "gap-y": readonly ["row-gap"];
  readonly top: readonly ["top"];
  readonly right: readonly ["right"];
  readonly bottom: readonly ["bottom"];
  readonly left: readonly ["left"];
};
```

Default spacing key → CSS properties of its `@utility sp-<key>`. `options.spacing.properties` REPLACES this map; spread it to extend.

<!-- /signature -->

Các key spacing mặc định và các thuộc tính CSS mà mỗi utility `sp-<key>` thiết lập.
