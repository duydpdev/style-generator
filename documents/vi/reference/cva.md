<!-- source: documents/reference/cva.md sha256: 54651c41e6ee -->

# Helper CVA (./cva)

Các helper an toàn cho trình duyệt (browser-safe) giúp biến các key token thành các tên class mà các dòng `@source inline` được sinh ra bao phủ, dành cho `class-variance-authority` hoặc bất kỳ variant map nào.

## `createVariantMapper`

<!-- signature: createVariantMapper -->

```ts
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefix: P, tokens: readonly T[]): VariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
>(prefixes: readonly P[], tokens: readonly T[]): MultiVariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends string,
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly allowUnregisteredPrefix: true;
  },
): VariantMap<T, P>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly opacities: readonly N[];
    readonly states?: S;
  },
): OpacityVariantMap<T, P, S, N>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const N extends number,
  const S extends readonly string[] = readonly [],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: {
    readonly opacities: readonly N[];
    readonly states?: S;
  },
): {
  readonly [Px in P]: OpacityVariantMap<T, Px, S, N>;
};
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefix: P,
  tokens: readonly T[],
  opts: {
    readonly states: S;
  },
): StateVariantMap<T, P, S>;
export declare function createVariantMapper<
  const T extends string,
  const P extends RegistryPrefix | "",
  const S extends readonly string[],
>(
  prefixes: readonly P[],
  tokens: readonly T[],
  opts: {
    readonly states: S;
  },
): {
  readonly [Px in P]: StateVariantMap<T, Px, S>;
};
```

Creates a mapping of tokens to their corresponding prefixed CSS classes.
Classes are always kebab-cased with the SAME `toKebabCase` used by the
registry (`flattenByCategory`/`generateSourceInline`), so a mapper's
output is guaranteed to match a class the registry emits `@source
inline(...)` for.

The optional `{ states }` argument (e.g. `COLOR_STATES`) lists state names
to look up as sibling RAW tokens. For a raw token `t`, a state `s` is
appended to `t`'s class only when `tokens` also contains `t` + Pascal-cased
`s` (`primary` + `"hover"` -> `primaryHover`). A token with no matching
sibling keeps its plain single class; sibling tokens themselves are plain
single classes. The result is a literal chained string when `states` is a
literal tuple (`as const`, `COLOR_STATES`) and `string` when it is typed
`readonly string[]`. `{ allowUnregisteredPrefix: true }` accepts any
prefix string instead of only registry prefixes.

`{ opacities }` (e.g. `tokens.opacities`) adds a `token/step` key per token
and step mapped to `class/step` (`primary/10` -> `bg-primary/10`); combined
with `{ states }`, the state classes stay on the base key only
(`primary/10` never carries `hover:`). Not combinable with
`allowUnregisteredPrefix`.

<!-- /signature -->

`createVariantMapper(prefix, tokens)` trả về một `Record<token, class>` phẳng. Các class luôn được kebab-case bằng cùng hàm mà registry sử dụng, do đó mọi class mà nó trả về đều là class được `@source inline` phát ra:

```ts
import { cva } from "class-variance-authority";
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme);

const bg = createVariantMapper("bg", DesignTokens.Web.colors);
// { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

const button = cva("rounded px-4 py-2", { variants: { color: bg } });
button({ color: "primary" }); // → "rounded px-4 py-2 bg-primary"

// prefix "" yields the bare kebab-case token (typography):
createVariantMapper("", DesignTokens.Web.typography); // { text12Mono: "text-12-mono", … }

// several prefixes at once → nested map
createVariantMapper(["border-x", "border-y"], DesignTokens.Web.borderWidth);
```

**Các class trạng thái.** Với các key anh em `primaryHover` / `primaryActive` trong theme, `{ states }` sẽ gom chúng thành một chuỗi class duy nhất cho mỗi token gốc:

```ts
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const tokens = ["primary", "primaryHover", "primaryActive", "danger"] as const;
const bgStates = createVariantMapper("bg", tokens, { states: COLOR_STATES });
// {
//   primary: "bg-primary hover:bg-primary-hover active:bg-primary-active",
//   primaryHover: "bg-primary-hover",
//   primaryActive: "bg-primary-active",
//   danger: "bg-danger",
// }
```

Hãy luôn truyền `COLOR_STATES` thay vì tự viết cứng mảng — đó chính là danh sách dùng để sinh ra các dòng trạng thái `@source inline`.

**Ràng buộc prefix.** `prefix` có kiểu `RegistryPrefix | ""` (các prefix mà registry sinh ra `@source inline`; `""` là typography), do đó `createVariantMapper("fill", …)` và một prefix lưu trong biến kiểu `string` đều là lỗi kiểu: chúng sẽ map sang các class mà không có dòng `@source inline` nào giữ lại. Để bỏ qua ràng buộc này cho một prefix đơn lẻ, hãy truyền `{ allowUnregisteredPrefix: true }` làm đối số thứ ba và tự khai báo các class đó trong CSS của app bằng một directive `@source inline(...)` thuần của Tailwind. Tùy chọn bỏ qua này không kết hợp được với `{ states }`, với `{ opacities }` hoặc với một mảng các prefix.

**Bước độ mờ.** `{ opacities }` thêm một key `token/step` cho mỗi token và mỗi bước (`primary/10` → `bg-primary/10`). Hãy truyền vào đó `DesignTokens.Web.opacities`, danh sách chính là `options.coverage.colors.opacities`, để các key bạn có thể gõ đúng bằng các class mà dòng độ mờ `@source inline` giữ lại. Với `{ states }`, các class trạng thái chỉ nằm trên key gốc (`primary/10` không bao giờ mang `hover:`); với một mảng các prefix, mỗi map prefix đều nhận các key này. Khi không có tùy chọn, `opacities` là `[]` và map không có key phụ nào.

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { createDesignTokens } from "@duydpdev/style-generator/tokens";

const theme = { colors: { primary: "#2563eb", muted: "#6b7280" } } as const;
const options = { coverage: { colors: { opacities: [10, 50] } } } as const;

const web = createDesignTokens(theme, options).DesignTokens.Web;
const bg = createVariantMapper("bg", web.colors, {
  opacities: web.opacities,
});
const half: "bg-primary/50" = bg["primary/50"];
```

Hãy truyền cùng một object `options` cho plugin bundler hoặc `style-gen.config.json` để dòng độ mờ `@source inline` và `web.opacities` khớp nhau.

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

Các hậu tố trạng thái tương tác (`hover`, `active`) được chia sẻ giữa các dòng trạng thái `@source inline` và `createVariantMapper(…, { states })`.

## `toKebabCase`

<!-- signature: toKebabCase -->

```ts
export declare const toKebabCase: (str: string) => string;
```

Converts a camelCase token key to the kebab-case used in class names and CSS variables: `"blue500"` → `"blue-500"`, `"primaryFG"` → `"primary-fg"`, `"2xl"` → `"2xl"`.

<!-- /signature -->

Hàm chuyển camelCase → kebab-case mà registry và mapper dùng chung (`blue500` → `blue-500`, `2xl` → `2xl`).
