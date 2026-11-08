<!-- source: documents/reference/core.md sha256: a8e9e4bf37bf -->

# API lõi (@duydpdev/style-generator)

Barrel gốc `@duydpdev/style-generator`: `generate()`, các helper cho theme và tùy chọn, `formatZodError` và các type. Các helper token có kiểu, CVA và spacing nằm ở `./tokens`, `./cva` và `./spacing` (đã chuyển khỏi root từ 6.0, xem [hướng dẫn nâng cấp](../migration/5.x-to-6.0.md)). Nó kéo theo Zod, vì vậy hãy dùng subpath trong mã chạy ở trình duyệt.

## Các export theo subpath

Để tree-shaking, hãy import từ các subpath thay vì barrel gốc:

```ts
// Generator + validated theme helpers (pulls in Zod) — root barrel only
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";

// Browser-safe (no Zod, no Node built-ins)
import {
  createDesignTokens,
  COLOR_STATES,
} from "@duydpdev/style-generator/tokens";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

// Component-side recipes (no Zod; tailwind-merge stays your own dependency)
import {
  createTailwindMergeExtension,
  splitSpacingProps,
  themeAxisAttributes,
} from "@duydpdev/style-generator/recipes";

// Styleless component kit (class-variance-authority, clsx, tailwind-merge are your own dependencies)
import { createCn, splitLayout } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type {
  ThemeConfig,
  ColorVariant,
} from "@duydpdev/style-generator/types";

// Build-tool integrations (Node only)
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { styleGenNext } from "@duydpdev/style-generator/next";
```

Yêu cầu `tsconfig.json#compilerOptions.moduleResolution` là `"bundler"`, `"node16"`, hoặc `"nodenext"`; **`"node10"` (`"node"` cũ) không được hỗ trợ**: package không có `typesVersions`, nên các subpath sẽ không resolve được ở đó. Bản build ESM và CJS đều kèm theo file declaration riêng (`.d.ts` cho `import`, `.d.cts` cho `require`), nhờ đó consumer dùng CommonJS dưới `node16`/`nodenext` sẽ resolve đúng kiểu thay vì gặp lỗi lệch "masquerading as ESM" (`yarn check:types-pack` kiểm tra điều này bằng `@arethetypeswrong/cli`). `dist/*.d.cts` chính là `.d.ts` được viết lại một chỗ: import `vite` chuyển thành type-only `import type { Plugin } from 'vite' assert { 'resolution-mode': 'import' }`, vì Vite không có kiểu CommonJS dùng được (5/6 đi kèm stub `export = any`, 7/8 chỉ hỗ trợ ESM). `yarn typecheck:dist` kiểm tra kiểu của `.d.cts` như một CommonJS consumer (`module: node16`, `skipLibCheck: false`). Trên TypeScript 5.0–5.2, dòng `assert` đó sẽ bị báo lỗi (`TS4125`) khi một consumer CommonJS bật `skipLibCheck: false`; `skipLibCheck: true` (mặc định trong hầu hết cấu hình) và TypeScript >= 5.3 không bị ảnh hưởng. Xem [`documents/migration/3.x-subpath-exports.md`](../../migration/3.x-subpath-exports.md) để biết bối cảnh và [`documents/migration/3.x-to-4.0.md`](../migration/3.x-to-4.0.md) để xem các thay đổi trong 4.0.0.

## Toàn bộ export theo subpath

| Export                                                                                                                                                                                                                            | Subpath                                     | Mô tả                                                                                                                                                                                                                       |
| :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`                                                                                                                                                                                                                        | `.`                                         | **Entry chính.** Trả về `{ css, tokens, schema }` từ một theme đã kiểm tra hợp lệ bằng Zod.                                                                                                                                 |
| `defineTheme`, `defineOptions`                                                                                                                                                                                                    | `.`                                         | Helper an toàn kiểu; `defineTheme` cũng kiểm tra hợp lệ khi runtime.                                                                                                                                                        |
| `formatZodError`                                                                                                                                                                                                                  | `.`                                         | Định dạng `ZodError` được ném bởi `generate()`/`defineTheme()` thành từng dòng `path → message` cho mỗi lỗi.                                                                                                                |
| `generateThemeCss`                                                                                                                                                                                                                | `.`                                         | Chỉ sinh biến `:root`, override cho trục và `@theme inline`; kiểm tra hợp lệ theme (và tham số tùy chọn thứ hai `options`, trong đó chỉ `axes` và `resetTailwindDefaults` có tác dụng) tương tự `generate()`.               |
| `createDesignTokens`                                                                                                                                                                                                              | `./tokens`                                  | `DesignTokens.Web.*` có kiểu.                                                                                                                                                                                               |
| `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                                                                                                              | `./cva` (`COLOR_STATES` cũng ở `./tokens`)  | Token key → tên class cho CVA, tùy chọn `{ states }`; `toKebabCase` là hàm mà registry và mapper dùng chung.                                                                                                                |
| `resolveSpacing`, `resolveSpacingProps`                                                                                                                                                                                           | `./spacing`                                 | Props spacing → `{ className(s), style }`.                                                                                                                                                                                  |
| `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`, `SpacingProps`, `TailwindMergeExtension`, `TailwindMergeTokens`                                                                                       | `./recipes` (không có trong `.`)            | Recipe phía component, xem [Recipes](./recipes.md).                                                                                                                                                                         |
| `recipeFromTables`, `pick`, `contrastText`, `createCn`, `splitSpacing`, `splitLayout`, `mergeStyle`, `RecipeTokens`, `VariantTable`, `RecipeTables`, `RecipeProps`, `RecipeFn`, `Cn`, `StyleRecord`, `Split`, `ThemeSpacingProps` | `./ui` (không có trong `.`)                 | Bộ component không kèm style, xem [UI kit](./ui.md).                                                                                                                                                                        |
| `Polymorphic`                                                                                                                                                                                                                     | `./ui-react` (chỉ có type)                  | Prop `as` đa hình cho các React component, xem [React types](./ui-react.md).                                                                                                                                                |
| `styleGenVite`                                                                                                                                                                                                                    | `./vite`                                    | Plugin Vite ghi file `theme.css`.                                                                                                                                                                                           |
| `styleGenNext`                                                                                                                                                                                                                    | `./next`                                    | Wrapper cấu hình Next.js ghi file `theme.css`.                                                                                                                                                                              |
| `Breakpoint`, `defaultScreens`                                                                                                                                                                                                    | `./tokens`                                  | `Breakpoint` const + type và độ rộng mặc định.                                                                                                                                                                              |
| `DEFAULT_ROUNDED_VALUES`, `DEFAULT_BORDER_VALUES`                                                                                                                                                                                 | `./tokens`                                  | Giá trị dự phòng cho `borderRadius` / `borderWidth`.                                                                                                                                                                        |
| `DEFAULT_SPACING_PROPERTIES`                                                                                                                                                                                                      | `./spacing`                                 | Map mặc định từ spacing key → CSS properties.                                                                                                                                                                               |
| `roundedProperties`, `borderProperties`                                                                                                                                                                                           | `./tokens`                                  | Danh sách tiền tố class của các nhóm `borderRadius` / `borderWidth`.                                                                                                                                                        |
| Types: theme & options                                                                                                                                                                                                            | `./types`, `.`                              | `ThemeConfig`, `ThemeOverride`, `TypographyConfig`, `StyleGeneratorOptions`, `ExactOptions`, `CoverageRule`, `SpacingPropertyMap`, `CategoryKey`.                                                                           |
| Types: tokens & inference                                                                                                                                                                                                         | `./types`, `.`                              | `DesignTokensResult`, `DesignTokensWeb`, `CategoryTokenKey`, `InferBorderWidthOptions`, `InferRoundedOptions`, `InferSpacingKeys`, `BreakpointKeys`, `SpacingKeys`, `ScreenKeys`, `OpacitySteps`, `CamelCase`, `KebabCase`. |
| Types: variants                                                                                                                                                                                                                   | `./types`, `.`                              | `DesignTokenKeys`, `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`.                                                                      |
| Types: theme axes                                                                                                                                                                                                                 | `./types`, `.`                              | `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState`.                                                                                                                                                                      |
| Types: responsive spacing                                                                                                                                                                                                         | `./types`, `./spacing`, `.`                 | `ResponsiveValueStrict`, `DefaultBreakpointKeys`.                                                                                                                                                                           |
| Types: default values                                                                                                                                                                                                             | `./types` (`SpacingKey` cũng ở `./spacing`) | `SpacingKey`, `DefaultBorderValue`, `DefaultRoundedValue`.                                                                                                                                                                  |
| Types: `GenerateResult`                                                                                                                                                                                                           | `.` (không có trong `./types`)              | Kiểu trả về của `generate()`.                                                                                                                                                                                               |

## Các peer dependency

Các peer dependency (`typescript`, `vite` và bốn peer của UI-kit là tùy chọn: chỉ cài đặt nếu bạn kiểm tra kiểu với package, dùng `styleGenVite`, hoặc import `./ui`/`./ui-react`):

| Peer                       | Dải phiên bản                           | Đã kiểm thử trong CI              | Ghi chú                                                                                          |
| -------------------------- | --------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ |
| `node`                     | `^20.19.0 \|\| >=22.12.0`               | 20.19.0 (built-package smoke), 22 | Hỗ trợ `require(esm)` không cần cờ, nhờ đó các entry CJS có thể nạp `chokidar@5` vốn chỉ có ESM. |
| `tailwindcss`              | `^4.1.0`                                | 4.1.x, 4.3.0                      | Không hỗ trợ Tailwind v3. `@source inline(...)` cần 4.1 trở lên.                                 |
| `typescript`               | `^5 \|\| ^6` (tùy chọn)                 | 5.9, 6.0                          | Dùng để kiểm tra kiểu với `.d.ts` của package. TypeScript 7 (bản port native) chưa được hỗ trợ.  |
| `vite`                     | `^5 \|\| ^6 \|\| ^7 \|\| ^8` (tùy chọn) | 5.4, 6.4, 7.3, 8.3                | Chỉ dùng cho `styleGenVite` (Nuxt cũng sử dụng).                                                 |
| `class-variance-authority` | `^0.7.0` (tùy chọn)                     | phiên bản trong lockfile          | Chỉ dùng cho `./ui` (`recipeFromTables`).                                                        |
| `clsx`                     | `^1.2.0 \|\| ^2.0.0` (tùy chọn)         | phiên bản trong lockfile          | Chỉ dùng cho `./ui` (`createCn`, kiểu `ClassValue`).                                             |
| `tailwind-merge`           | `^3.0.0` (tùy chọn)                     | phiên bản trong lockfile          | Chỉ dùng cho `./ui` (`createCn`); `./recipes` không bao giờ import nó.                           |
| `@types/react`             | `^18.0.0 \|\| ^19.0.0` (tùy chọn)       | phiên bản trong lockfile          | Chỉ dùng cho các kiểu của `./ui-react`.                                                          |

> [!WARNING]
> npm 7 trở lên vẫn báo lỗi `ERESOLVE` khi cây dependency của bạn đã có sẵn một bản nằm ngoài dải của một peer tùy chọn (`class-variance-authority`, `clsx`, `tailwind-merge`, `@types/react`), kể cả khi ứng dụng không bao giờ import `./ui` hay `./ui-react`. Hãy đưa phiên bản đó về đúng dải ở bảng trên, hoặc cài đặt với `--legacy-peer-deps`.

CI chạy phiên bản phát hành mới nhất của từng bản major trong mục "Đã kiểm thử trong CI"; cận dưới của một dải (ví dụ `vite@5.0.0`) không được kiểm thử. Job `check` bao gồm các phiên bản trong lockfile (Vite 7.3, TypeScript 5.9). Job `peer-matrix` kiểm thử Vite 5, 6 và 8 cùng TypeScript 6: nó build `examples/harness`, chạy một Vite dev server phát sinh lại file khi theme được sửa, và kiểm tra kiểu cho ví dụ cùng `dist/*.d.ts`. Một nhánh kiểm thử thất bại đối với một bản major đã phát hành sẽ khiến CI thất bại. TypeScript 7 không có nhánh CI: bản vá `compat/typescript` tích hợp sẵn của Yarn không áp dụng cho `typescript@7`, nên nhánh này thậm chí không thể cài đặt (xem [`documents/testing.md`](../testing.md)).

`zod` là một dependency thông thường của package; bạn không cần tự cài đặt nó.

## `generate`

<!-- signature: generate -->

```ts
export declare function generate<const TTheme extends ThemeConfig>(
  theme: TTheme,
): GenerateResult<TTheme>;
export declare function generate<
  const TTheme extends ThemeConfig,
  const O extends StyleGeneratorOptions = StyleGeneratorOptions,
>(
  theme: TTheme,
  options: ExactOptions<O> | undefined,
): GenerateResult<TTheme, O>;
```

Generate the complete registry-driven CSS string (breakpoint `@theme`
override + theme vars + `@theme inline` mapping + typography/spacing
`@utility` blocks) and typed design tokens for a theme. Returns a single
static CSS string meant to be written to a file and `@import`ed alongside
`@import "tailwindcss"` (Tailwind v4 only).

Validates `options` first, then `theme` against `ThemeSchema` — independent
of whether the caller already went through `defineTheme()` — so CLI/Vite/
Next callers that hand it raw `JSON.parse()` output get the same
guarantees. Both failures are a `ZodError`.

With `options`, their literal `breakpoints`, `screens` and
`spacing.properties` keys type `tokens`; options typed as
`StyleGeneratorOptions`, or an explicit `<typeof theme>` type argument
(which leaves `O` at its default), widen them to `string`. Without
`options` the tokens carry the library defaults.

<!-- /signature -->

Biên dịch một theme đã được kiểm tra hợp lệ thành `{ css, tokens, schema }`. Theme được mô tả trong [Cấu hình theme](./theme.md) và tham số thứ hai nằm trong [Tùy chọn](./options.md).

## `generateThemeCss`

<!-- signature: generateThemeCss -->

```ts
export declare const generateThemeCss: (
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
) => string;
```

Generate a complete CSS string for Tailwind v4 `\@theme` integration.

Output includes:

1. `:root` block with `--sg-*` intermediate CSS variables
2. `html[data-<axis-kebab>="<variant-kebab>"]` blocks for each `themeAxes`
   axis/variant, in config declaration order (both axes and variants) —
   the selector is pinned to `html` because a `$`-alias
   `var()` resolves to the value computed at the element that DECLARES the
   custom property, so an override on a non-root element wouldn't affect
   an alias's inherited value (see `.claude/CLAUDE.md`'s Theme rules).
3. `\@theme inline` block: the `resetTailwindDefaults` lines
   (`--color-*: initial;`, …) first, then the mapping of `--sg-*` → Tailwind v4 namespaces

Parses `options` and `config` like `generate()` — options first — so an
invalid or injection-unsafe option or theme throws a `ZodError` instead of
reaching the CSS.

<!-- /signature -->

Chỉ dựng chuỗi CSS (các biến `:root`, các khối `themeAxes`, ánh xạ `@theme inline`) từ một theme đã kiểm tra hợp lệ. Xem [Cấu hình theme](./theme.md).

## `GenerateResult`

<!-- signature: GenerateResult -->

```ts
export declare interface GenerateResult<
  TTheme extends ThemeConfig,
  O = Record<never, never>,
> {
  css: string;
  tokens: DesignTokensResult<TTheme, O>["DesignTokens"];
  schema: typeof themeJsonSchema;
}
```

What {@link generate} returns for theme `TTheme` and options `O`.

<!-- /signature -->

Kiểu dữ liệu mà `generate()` trả về cho một kiểu theme và options; kiểu này chỉ được export từ `.`, không có trong `./types`.

## `defineTheme`

<!-- signature: defineTheme -->

```ts
export declare function defineTheme<const T extends ThemeConfig>(config: T): T;
```

Runtime-validated theme config helper — the only place `defineTheme` is
exported from is the root barrel (`.`), never `./tokens`, so Zod never
reaches the browser-safe subpaths. Parses `config` against `ThemeSchema`
and returns the parsed result, throwing a `ZodError` (with a precise
`path`) for unknown keys or CSS-injection-unsafe values.

`generate()`, the CLI, and the Vite plugin all re-validate independently,
so calling `defineTheme()` is optional — but doing so surfaces the same
error as an IDE type error too, since `T` is checked against
`ThemeConfig` at compile time.

<!-- /signature -->

Kiểm tra kiểu và kiểm tra hợp lệ theme lúc runtime; ném một `ZodError` khi gặp key lạ hoặc giá trị không an toàn. Xem [Cấu hình theme](./theme.md).

## `defineOptions`

<!-- signature: defineOptions -->

```ts
export declare function defineOptions<const O extends StyleGeneratorOptions>(
  options: ExactOptions<O>,
): O;
```

Type-safe options helper. Zero runtime cost. `const O` keeps the literal
`breakpoints`, `screens` and `spacing.properties` keys, which flow into
`DesignTokensWeb<T, O>` when the same object is passed to `generate()` or
`createDesignTokens()`.

<!-- /signature -->

Helper tùy chọn an toàn kiểu và không tốn chi phí runtime; nó giữ lại các literal key của `breakpoints`, `screens` và `spacing.properties`. Xem [Tùy chọn](./options.md).

## `formatZodError`

<!-- signature: formatZodError -->

```ts
export declare const formatZodError: (error: z.ZodError) => string;
```

Format every issue in a `ZodError` as one `"path → message"` line, safe to
print to a terminal or throw as a plain `Error` message — every CLI/Vite
consumer that catches a `ZodError` from `ThemeSchema.parse()` funnels it
through this instead of dumping the raw (deeply nested) `ZodError` object.
Record-key grammar failures arrive as `invalid_key` wrappers whose useful
message (e.g. the `_` hint) lives in the nested issues, so those are
surfaced instead of Zod's generic "Invalid key in record".

<!-- /signature -->

Định dạng mọi vấn đề của một `ZodError` thành từng dòng `path → message`. Xem [Báo cáo lỗi kiểm tra hợp lệ](../cookbook.md#báo-cáo-lỗi-kiểm-tra-hợp-lệ).
