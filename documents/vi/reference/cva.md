<!-- source: documents/reference/cva.md sha256: 0fa7f1252426 -->

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
  const S extends readonly ColorState[] = readonly [],
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
  const S extends readonly ColorState[] = readonly [],
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
  const S extends readonly ColorState[],
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
  const S extends readonly ColorState[],
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

Maps tokens to prefixed classes kebab-cased like the registry's, so each class has an `@source inline` line.
`{ states }` chains `variant:class` for sibling tokens (`primaryHover`); `{ opacities }` adds `token/step` keys.

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

Hãy luôn truyền `COLOR_STATES` thay vì tự viết cứng bảng — đó chính là danh sách dùng để sinh ra các dòng trạng thái `@source inline`.

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

Hãy đặt cùng `coverage.colors.opacities` trong `style-gen.config.json` (file mà plugin bundler và CLI đọc) để dòng độ mờ `@source inline` và `web.opacities` khớp nhau; file `theme.tokens.ts` được sinh ra mang `opacities` từ file đó.

## `COLOR_STATES`

<!-- signature: COLOR_STATES -->

```ts
export declare const COLOR_STATES: readonly [
  {
    readonly suffix: "Hover";
    readonly variant: "hover";
  },
  {
    readonly suffix: "Active";
    readonly variant: "active";
  },
  {
    readonly suffix: "Selected";
    readonly variant: "aria-selected";
  },
];
```

States a color token opts into via a sibling key; single source for the registry and `createVariantMapper`.

<!-- /signature -->

Bảng trạng thái tương tác (`Hover` → `hover:`, `Active` → `active:`, `Selected` → `aria-selected:`) được chia sẻ giữa các dòng trạng thái `@source inline` và `createVariantMapper(…, { states })`.

## `ColorState`

<!-- signature: ColorState -->

```ts
export declare interface ColorState {
  readonly suffix: string;
  readonly variant: string;
}
```

One interactive state: sibling key `<token><suffix>` (`primaryHover`), class behind `variant` (`hover:bg-primary-hover`).

<!-- /signature -->

## `toKebabCase`

<!-- signature: toKebabCase -->

```ts
export declare const toKebabCase: (str: string) => string;
```

Converts a camelCase token key to the kebab-case used in class names and CSS variables: `"blue500"` → `"blue-500"`, `"primaryFG"` → `"primary-fg"`, `"2xl"` → `"2xl"`.

<!-- /signature -->

Hàm chuyển camelCase → kebab-case mà registry và mapper dùng chung (`blue500` → `blue-500`, `2xl` → `2xl`).
