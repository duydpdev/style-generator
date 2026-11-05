<!-- source: documents/reference/ui.md sha256: 6807bc44d5cf -->

# UI kit (./ui)

Bộ kit không định kiểu (styleless) để dựng các component trên theme của bạn: các recipe từ các bảng class thuần túy, một hàm `cn` hiểu rõ các class của theme, và các hàm tách (splitter) biến các prop layout và spacing thành class và inline style. Bộ kit này không render bất kỳ thứ gì và không đính kèm CSS nào. Subpath này không được re-export từ `.` và không định danh bất kỳ kiểu React nào (`Polymorphic` của React nằm trong [`./ui-react`](./ui-react.md)), nhờ đó các ứng dụng Vue cũng sử dụng được.

`./ui` import ba package lúc runtime; chúng là các peer dependency tùy chọn, vì vậy hãy cài đặt chúng trong ứng dụng có import `./ui`:

```bash
yarn add class-variance-authority@^0.7.0 clsx@^2.1.1 tailwind-merge@^3.0.0
```

Các phiên bản được hỗ trợ: `class-variance-authority` `^0.7.0`, `clsx` `^1.2.0 || ^2.0.0`, `tailwind-merge` `^3.0.0`; `./ui-react` cần `@types/react` `^18.0.0 || ^19.0.0`.

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  createCn,
  mergeStyle,
  recipeFromTables,
  splitLayout,
} from "@duydpdev/style-generator/ui";

// `tokens` = createDesignTokens(theme, options).DesignTokens.Web
import { tokens } from "./tokens";

// 1. One `cn` per theme: a later `rounded-pill` replaces `rounded-md`.
export const cn = createCn(tokens);

// 2. A recipe from plain class tables (cva underneath).
const box = recipeFromTables({
  base: "flex",
  variants: { rounded: createVariantMapper("rounded", tokens.borderRadius) },
});

// 3. Layout props → recipe classes, size style and `.sp-*` spacing; the rest passes through.
//    A numeric size becomes px (`320` → `"320px"`, `0` → `"0"`); a string is kept.
const props = {
  rounded: "pill",
  p: 4,
  width: 320,
  id: "card",
};
const split = splitLayout(
  props,
  box,
  tokens.spacingProperties,
  ["rounded"],
  ["width", "height"],
);
export const element = {
  ...split.rest,
  className: cn(split.className, "shadow-md"),
  style: mergeStyle(split.style),
};
```

Các component harness trong [`examples/react-v4/src/ui/`](../../../examples/react-v4/src/ui/Box.tsx) và các factory recipe trong [`examples/design-system`](../../../examples/design-system/README.md) đều được dựng trên bộ kit này; [Component](../components.md) hướng dẫn chi tiết qua một component mẫu.

## `recipeFromTables`, `RecipeTables`, `VariantTable`, `RecipeProps`, `RecipeFn`

<!-- signature: recipeFromTables -->

```ts
export declare const recipeFromTables: (tables: RecipeTables) => RecipeFn;
```

cva over a recipe's tables. Compound and default entries are loose
records, so they are cast here once instead of in every recipe.

<!-- /signature -->

<!-- signature: RecipeTables -->

```ts
export declare interface RecipeTables {
  readonly base: ClassValue;
  readonly variants: VariantTable;
  readonly compoundVariants?:
    | readonly Readonly<Record<string, ClassValue>>[]
    | undefined;
  readonly defaultVariants?:
    | Readonly<Record<string, string | boolean | undefined>>
    | undefined;
}
```

A recipe as plain data: the cva input.

<!-- /signature -->

<!-- signature: VariantTable -->

```ts
export declare type VariantTable = Record<string, Record<string, ClassValue>>;
```

Variant name → option → classes (the `variants` of a cva config).

<!-- /signature -->

<!-- signature: RecipeProps -->

```ts
export declare type RecipeProps = Readonly<
  Record<string, string | number | boolean | null | undefined>
>;
```

Recipe call props: variant name → option (`true`/`false` for boolean variants, a number for a numeric option such as `zIndex: 10`).

<!-- /signature -->

<!-- signature: RecipeFn -->

```ts
export declare type RecipeFn = (props?: RecipeProps) => string;
```

A recipe built from tables: props in, one class string out; components type the exact props.

<!-- /signature -->

- Một recipe là dữ liệu (`base`, `variants`, cùng các trường tùy chọn `compoundVariants` và `defaultVariants`); `recipeFromTables` chuyển nó thành một hàm bằng `class-variance-authority`.

## `RecipeTokens`

<!-- signature: RecipeTokens -->

```ts
export declare interface RecipeTokens {
  readonly colors: readonly string[];
  readonly typography: readonly string[];
  readonly shadows: readonly string[];
  readonly backDropBlurs: readonly string[];
  readonly borderRadius: readonly string[];
  readonly borderWidth: readonly string[];
  readonly spacingProperties: readonly string[];
  readonly breakpoints: readonly string[];
  readonly opacities?: readonly number[];
}
```

The token arrays a recipe factory reads: a structural subset of
`DesignTokens.Web`, so `generate().tokens.Web` and
`createDesignTokens().DesignTokens.Web` are assignable to it.

<!-- /signature -->

- `generate().tokens.Web` và `createDesignTokens().DesignTokens.Web` có thể gán được vào kiểu này.

## `pick`, `contrastText`

<!-- signature: pick -->

```ts
export declare const pick: (map: object, key: string) => string;
```

`map[key]`, or a thrown error naming the missing token, so a renamed
theme token fails loudly instead of rendering no class.

<!-- /signature -->

<!-- signature: contrastText -->

```ts
export declare const contrastText: (
  colors: readonly string[],
  intent: string,
  fallback: string,
) => string;
```

`text-on-<intent>` when the theme declares the `on<Intent>` sibling
color, else `text-<fallback>`.

<!-- /signature -->

- `pick` sẽ ném lỗi kèm tên token thay vì trả về `undefined`, nhờ đó một token theme bị đổi tên sẽ báo lỗi ngay ở lần render đầu tiên.

## `createCn`, `Cn`

<!-- signature: createCn -->

```ts
export declare const createCn: (tokens: TailwindMergeTokens) => Cn;
```

One `cn` per theme. `clsx` joins the inputs; a `tailwind-merge`
extended with `createTailwindMergeExtension(tokens)` then keeps the
last class of each group, including the theme's own classes
(`text-16-medium`, `shadow-md`, `rounded-pill`, `border-thin`), which
the default `tailwind-merge` does not know.

<!-- /signature -->

<!-- signature: Cn -->

```ts
export declare type Cn = (...inputs: ClassValue[]) => string;
```

clsx + a tailwind-merge that knows one theme's custom utilities.

<!-- /signature -->

- `createCn(tokens)` = `clsx` + `tailwind-merge` được mở rộng với [`createTailwindMergeExtension`](./recipes.md#createtailwindmergeextension-tailwindmergeextension-tailwindmergetokens).

## `splitSpacing`, `splitLayout`, `Split`

<!-- signature: splitSpacing -->

```ts
export declare const splitSpacing: (
  props: object,
  keys: readonly string[],
) => Split;
```

Spacing props → `.sp-*` classes + `--sg-sp-*` style (the library's
`splitSpacingProps`); the rest passes through.

<!-- /signature -->

<!-- signature: splitLayout -->

```ts
export declare const splitLayout: (
  props: object,
  box: RecipeFn,
  spacingKeys: readonly string[],
  variantKeys: readonly string[],
  sizeKeys: readonly string[],
  extra?: Readonly<Record<string, string | boolean>>,
) => Split;
```

Layout props → box-recipe classes, size style and spacing; the rest
passes through. A key in `variantKeys` is a recipe variant (a string or a
finite number is passed on; anything else becomes `undefined`); a key in `sizeKeys` is an
inline size: a string is kept, a finite number `n` becomes `"<n>px"`
(`0` becomes `"0"`), anything else is dropped. `extra` variants win
over props.

<!-- /signature -->

<!-- signature: Split -->

```ts
export declare interface Split {
  readonly className: string;
  readonly style: StyleRecord;
  readonly variants: Readonly<
    Record<string, string | number | boolean | undefined>
  >;
  readonly rest: Readonly<Record<string, unknown>>;
}
```

The result of `splitSpacing`/`splitLayout`: classes, inline style, the variant props found, and the props left for the element.

<!-- /signature -->

- `splitLayout(props, box, spacingKeys, variantKeys, sizeKeys, extra)`: `variantKeys` là tên các prop đóng vai trò là variant của recipe, `sizeKeys` là tên các prop đóng vai trò là kích thước inline; các variant riêng của component (`extra`) sẽ được ưu tiên hơn props.
- Một giá trị kích thước sẽ được chuyển đổi thành một độ dài CSS: một chuỗi ký tự được giữ nguyên, một số hữu hạn `n` trở thành `"<n>px"`, `0` trở thành `"0"` (đúng như những gì React render cho cùng các con số đó, nhờ đó CSS của một component React không bị thay đổi); bất kỳ giá trị nào khác đều bị bỏ qua.

## `ThemeSpacingProps`

<!-- signature: ThemeSpacingProps -->

```ts
export declare type ThemeSpacingProps<W extends RecipeTokens> = SpacingProps<
  W["breakpoints"][number],
  W["spacingProperties"][number]
>;
```

Every `tokens.spacingProperties` key, camelCased: a number or
`{ base, <bp> }` over `tokens.breakpoints`.

<!-- /signature -->

- Thu hẹp mọi prop spacing về đúng `spacingProperties` và `breakpoints` của theme bạn, nhờ đó một token bị đổi tên sẽ là một lỗi kiểu ngay tại vị trí gọi. Các prop layout chẳng hạn như `rounded` hoặc `backgroundColor` được ứng dụng định kiểu (harness tự khai báo `LayoutProps` riêng của mình), bởi vì bộ kit không định trước recipe nào.

## `mergeStyle`, `StyleRecord`

<!-- signature: mergeStyle -->

```ts
export declare const mergeStyle: <S extends object = StyleRecord>(
  ...parts: readonly (S | StyleRecord | undefined)[]
) => S | undefined;
```

The parts merged left to right; `undefined` when empty, so React
renders no `style=""`.

<!-- /signature -->

<!-- signature: StyleRecord -->

```ts
export declare type StyleRecord = Readonly<Record<string, string | number>>;
```

An inline style object: property (or `--custom-property`) → value. React accepts it as `style`.

<!-- /signature -->

- `mergeStyle` trả về `undefined` khi kết quả rỗng, nhờ đó React không render ra `style=""`. Tham số kiểu của nó là kiểu style của caller: khi có một phần mang kiểu `CSSProperties` nó trả về `CSSProperties`, khi các phần mang kiểu `StyleRecord` nó trả về `StyleRecord`.
