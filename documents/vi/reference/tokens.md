<!-- source: documents/reference/tokens.md sha256: f7c2f0bdfc7f -->

# Design token (./tokens)

Các key token có kiểu an toàn cho trình duyệt (browser-safe) được dựng từ một theme, cùng các hằng số mà generator chia sẻ với các component; subpath này không import Zod.

## `createDesignTokens`

<!-- signature: createDesignTokens -->

```ts
export declare function createDesignTokens<const TTheme extends ThemeConfig>(
  config: TTheme,
): DesignTokensResult<TTheme>;
export declare function createDesignTokens<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  config: TTheme,
  options: ExactOptions<O> | undefined,
): DesignTokensResult<TTheme, O>;
```

Creates a structured design tokens object from the theme configuration.
Useful for sharing token data with consumer applications (e.g., for CVA variant maps).
With `options`, `const O` keeps literal `breakpoints`, `screens` keys and
`spacing.properties` keys in the result's types; options typed as
`StyleGeneratorOptions` — or an explicit `<typeof theme>` type argument,
which leaves `O` at its default — widen them to `string`. Without
`options` the result carries the library defaults.

<!-- /signature -->

`generate()` trả về chúng dưới dạng `tokens`, đối tượng `{ Web }`; bạn cũng có thể dựng cùng đối tượng đó độc lập (an toàn cho trình duyệt) bằng `createDesignTokens`, hàm này trả về đối tượng dưới dạng `DesignTokens`:

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});
```

**`DesignTokens.Web`:**

| Token               | Mô tả                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`            | Mọi key màu (phẳng, camelCase)                                                                                                                       |
| `typography`        | Các key của `typography`                                                                                                                             |
| `shadows`           | Các key của `shadows`                                                                                                                                |
| `backDropBlurs`     | Các key của `backDropBlurs`                                                                                                                          |
| `fontFamily`        | Các key của `fontFamily`                                                                                                                             |
| `borderWidth`       | Các key của `borderWidth` (dùng giá trị dự phòng `0, 1, 2, 4` khi bị bỏ qua hoặc để trống)                                                           |
| `borderRadius`      | Các key của `borderRadius` (dùng giá trị dự phòng `DEFAULT_ROUNDED_VALUES` khi bị bỏ qua hoặc để trống)                                              |
| `spacingProperties` | Danh sách prop spacing — các key của `options.spacing.properties`, hoặc các giá trị mặc định                                                         |
| `breakpoints`       | Các breakpoint đang hoạt động — mặc định là `["md", "lg"]`                                                                                           |
| `screens`           | Map breakpoint → độ rộng: các screen mặc định cộng thêm các key của `options.screens`                                                                |
| `aliasedColors`     | Các key `colors` có giá trị là alias `"$<key>"` trong bản ghi gốc hoặc bất kỳ override `themeAxes` nào (những gì `coverage.keys: "aliased"` giữ lại) |

Mỗi mảng được đặt tên theo trường `ThemeConfig` tương ứng (`DesignTokens.Web.colors` chứa các key của `theme.colors`); `spacingProperties`, `breakpoints` và `screens` đến từ options. Mọi mảng đều là `readonly`, và options được suy luận kiểu dưới dạng literal (`generate`, `createDesignTokens` và `defineOptions` nhận `const O`): `createDesignTokens(theme, { breakpoints: ["md", "xl"] }).DesignTokens.Web.breakpoints` có kiểu `readonly ("md" | "xl")[]`. Options được chú thích kiểu là `StyleGeneratorOptions` sẽ nới rộng kiểu thành `readonly string[]`, và việc truyền tham số kiểu tường minh chỉ cho theme cũng làm như vậy (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`): hãy bỏ tham số kiểu để giữ lại các kiểu literal. Khi không có `options`, các giá trị mặc định sẽ được áp dụng (`readonly ("md" | "lg")[]`). `aliasedColors` được tính toán tại runtime từ bản ghi gốc và mọi override; kiểu của nó giữ lại từng key có giá trị là một literal `$…` hoặc một `string` thuần túy. Các kiểu tương ứng là `DesignTokensWeb<TTheme, O>` và `DesignTokensResult<TTheme, O>`.

**Một module options duy nhất.** Plugin bundler, `createDesignTokens` và các kiểu của recipe phải nhìn thấy cùng một options, nếu không độ bao phủ `@source inline` và các mảng token sẽ bị lệch nhau. Hãy đặt chúng trong một module không có dependency, có kiểu với `as const satisfies` và chỉ dùng import dạng type (`defineOptions` nằm ở entry gốc, vốn sẽ kéo Zod vào bundle trình duyệt):

```ts
// style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Import nó trong `vite.config.ts` / `next.config.ts` ([Vite](./vite.md), [Next](./next.md)) và trong `createDesignTokens(theme, options)`; `style-gen.config.json` phải lặp lại các giá trị tương tự nếu bạn cũng dùng CLI. Xem [`examples/design-system`](../../../examples/design-system/README.md).

## `Breakpoint`, `defaultScreens`

<!-- signature: Breakpoint -->

```ts
export declare const Breakpoint: {
  readonly SM: "sm";
  readonly MD: "md";
  readonly LG: "lg";
  readonly XL: "xl";
  readonly XXL: "2xl";
};
export declare type Breakpoint = (typeof Breakpoint)[keyof typeof Breakpoint];
```

Tailwind's default breakpoint keys. A const object (not an enum) so the
runtime values and the string-literal type are one structural thing:
`Breakpoint.MD` is `"md"`, and `const b: Breakpoint = "md"` compiles.

<!-- /signature -->

<!-- signature: defaultScreens -->

```ts
export declare const defaultScreens: Record<Breakpoint, string>;
```

Tailwind's default screen width per `Breakpoint` (`sm` 640px … `2xl` 1536px). `options.screens` is merged over it.

<!-- /signature -->

Các key breakpoint của Tailwind dưới dạng một const object, và độ rộng mặc định của chúng (`sm` 640px … `2xl` 1536px); `options.screens` được merge đè lên chúng.

## `COLOR_STATES`

<!-- signature: COLOR_STATES -->

```ts
export declare const COLOR_STATES: readonly ["hover", "active"];
```

Interactive state suffixes a flat color token can opt into by declaring a
sibling key (`primary` + `primaryHover` -> `hover:bg-primary-hover`).

Single source of truth for BOTH sides of the contract: the registry's
`colorsCategory.states` (which drives the `@source inline` state lines) and
consumers passing `{ states: COLOR_STATES }` to `createVariantMapper`.
Kept in its own dependency-free module so the browser-safe `./tokens` and
`./cva` subpaths can re-export it without pulling Zod or the registry.

<!-- /signature -->

Các hậu tố trạng thái tương tác (`hover`, `active`) mà một token màu có thể chọn sử dụng; xem [Helper CVA](./cva.md).

## `DEFAULT_BORDER_VALUES`, `DEFAULT_ROUNDED_VALUES`

<!-- signature: DEFAULT_BORDER_VALUES -->

```ts
export declare const DEFAULT_BORDER_VALUES: readonly [0, 1, 2, 4];
```

Default border width values, used when `theme.borderWidth` is omitted.

<!-- /signature -->

<!-- signature: DEFAULT_ROUNDED_VALUES -->

```ts
export declare const DEFAULT_ROUNDED_VALUES: readonly [
  "none",
  "xs",
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "full",
];
```

Default border radius values, used when `theme.borderRadius` is omitted.

<!-- /signature -->

Các giá trị độ rộng border và key radius được dùng khi theme bỏ qua `borderWidth` hoặc `borderRadius`.

## `borderProperties`, `roundedProperties`

<!-- signature: borderProperties -->

```ts
export declare const borderProperties: (typeof BORDER_PREFIXES)[number][];
```

Border class prefixes (`border`, `border-x` … `divide-y`) as a mutable array, typed so it passes `createVariantMapper(borderProperties, keys)` as is.

<!-- /signature -->

<!-- signature: roundedProperties -->

```ts
export declare const roundedProperties: (typeof ROUNDED_PREFIXES)[number][];
```

Mutable copies of the prefix lists, typed with the literal unions so they
pass `createVariantMapper(borderProperties, keys)` as they are.

<!-- /signature -->

Các prefix class (`border`, `border-x` … `divide-y`; `rounded`, `rounded-t` …) dưới dạng các mảng có thể thay đổi (mutable array), truyền trực tiếp được vào `createVariantMapper`.
