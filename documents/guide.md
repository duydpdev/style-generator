# User Guide

Hướng dẫn tích hợp `@duydpdev/style-generator` 5.0 vào dự án **Tailwind CSS v4**. Tra cứu đầy đủ (option, export, CLI) nằm ở [`README.md`](../README.md); đang nâng cấp từ 4.x thì đọc [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md), từ 3.x thì đọc [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

## Mục lục

1. [Cài đặt](#cài-đặt)
2. [Tạo Theme Config](#tạo-theme-config)
3. [Sinh CSS và import vào Tailwind](#sinh-css-và-import-vào-tailwind)
4. [Multi-axis theming](#multi-axis-theming)
5. [Spacing Helpers](#spacing-helpers)
6. [Design Tokens cho Component](#design-tokens-cho-component)
7. [TypeScript Tips](#typescript-tips)
8. [Nâng cấp từ bản cũ](#nâng-cấp-từ-bản-cũ)

---

## Cài đặt

Package được publish lên GitHub Packages (private). Cấu hình scope `@duydpdev` trong file mà package manager của bạn đọc (Yarn Berry đọc `.yarnrc.yml` và bỏ qua `.npmrc`); cách tạo PAT `read:packages` nằm ở mục Installation của [`README.md`](../README.md#1-installation).

Yarn Berry — `.yarnrc.yml`:

```yaml
npmScopes:
  duydpdev:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAlwaysAuth: true
    npmAuthToken: "${GITHUB_PAT}"
```

npm, pnpm, Yarn Classic — `.npmrc`:

```ini
@duydpdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

Rồi cài:

```bash
yarn add @duydpdev/style-generator
```

**Peer dependencies:** `tailwindcss >=4.1.0` (Tailwind v3 không còn được hỗ trợ); `typescript ^5 || ^6` (tuỳ chọn, để type-check theo `.d.ts` của package) và `vite ^5 || ^6 || ^7 || ^8` (tuỳ chọn, chỉ khi dùng `styleGenVite`). Bản đã được CI kiểm: bảng peer trong [`README.md`](../README.md). `zod` là dependency thường của package — không cần cài riêng.

```bash
yarn add tailwindcss typescript
```

---

## Tạo Theme Config

Tạo `styles/theme.json` chứa toàn bộ design tokens. Chỉ `colors` là bắt buộc; mọi field khác đều tuỳ chọn. Theme được kiểm bằng một Zod schema **strict**: key lạ, giá trị không an toàn hay alias hỏng đều bị từ chối trước khi sinh CSS.

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "blue500": "#3B82F6",
    "primary": "$blue500",
    "primaryForeground": "#FFFFFF",
    "sidebarForeground": "#111827",
    "background": "#FFFFFF",
    "muted": "#8E8E93"
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "backDropBlurs": { "sm": "4px" },
  "borderRadius": { "md": "8px" },
  "fontFamily": { "sans": "\"Inter\", system-ui, sans-serif" },
  "borderWidth": { "thin": "1px" }
}
```

| Field           | Sinh ra                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `colors`        | `bg-*`, `text-*`, `border-*` (bắt buộc)                                                                                            |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                        |
| `shadows`       | `shadow-*`                                                                                                                         |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                                  |
| `borderRadius`  | `rounded-*` (+ biến thể `md:`/`lg:` theo breakpoint đang bật)                                                                      |
| `fontFamily`    | `font-*` qua namespace `--font-*` của Tailwind                                                                                     |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` qua namespace `--border-width-*` của Tailwind (thay cho key `border` của bản 3.x) |
| `themeAxes`     | override theo trục (xem [Multi-axis theming](#multi-axis-theming))                                                                 |

### Quy ước key

Key màu là **camelCase** (hoặc kebab-case); lib tự đổi sang kebab-case cho biến CSS và class:

| Theme key           | CSS variable                 | Tailwind class            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

- Letter→digit thêm dash (`blue500` → `blue-500`); key bắt đầu bằng số giữ nguyên (`2xl`). Hai key cùng kebab-case về một tên (`blue500` và `blue-500`) bị từ chối.
- Key chỉ gồm chữ, số và `-`, bắt đầu bằng chữ hoặc số. **`_` bị từ chối ở mọi vị trí tên** (token, tên axis, tên variant): dùng `primaryActive` hoặc `primary-active`. Nguyên nhân: `toKebabCase` giữ `_` còn token có kiểu camelCase bỏ `_`, nên class do mapper sinh ra sẽ không tồn tại. CLI in lỗi dạng `colors.primary_active → … camelCase … kebab-case …`.
- Giá trị không được chứa `;`, `{`, `}`, `<`, `@`, `\`, `/*` hay xuống dòng; dấu nháy phải cân, và ngoặc `(`/`[` ngoài chuỗi có nháy cũng phải cân (`rgb(0 0 0` bị từ chối tại path của nó).
- Key typography phải kebab-case thành tên `@utility` hợp lệ (không bắt đầu bằng số hay dash): `heading1` → `.heading-1`.
- Key `fontFamily` không được trùng tên độ đậm của Tailwind (`thin`, `light`, `normal`, `medium`, `bold`, `black`, …).
- Mỗi category sở hữu một namespace biến `--sg-<category>-` riêng (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …) nên key ở hai category khác nhau không bao giờ trùng biến (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`).
- Key `typography` không được kebab-case thành `sp-*` hoặc `font-*` (sẽ che utility spacing và font); `fontWeight` phải là số từ 1 đến 1000 (số thập phân hợp lệ cho variable font).
- Key có chuỗi chữ hoa mở đầu từ hai ký tự trở lên (`CTA`, `ABtn`, `HTMLParser`) bị từ chối kèm gợi ý đổi tên (`cta`): class do typed token sinh ra (`c-ta`) khác class trong CSS (`cta`). Một chữ hoa đơn (`Blue`) hoặc chuỗi hoa ở giữa (`primaryCTA`) vẫn hợp lệ.
- Key `borderWidth` không được kebab-case trùng một key `colors` (cả hai cùng sinh class `border-<key>`).
- Bảng tóm tắt mọi quy tắc đặt tên, kèm ví dụ bị từ chối và hợp lệ: [Key rules trong README](../README.md#key-rules).

### Alias `$key`

Giá trị `"$<key>"` trỏ tới key khác **cùng category** và được phát thành `var(--<cssVarPrefix>-<kebab-key>)`, nên không phải lặp mã hex. Prefix thuộc về category (`sg-color` cho `colors`, `sg-shadow` cho `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`), nên alias `"$base"` trong `shadows` thành `var(--sg-shadow-base)` chứ không phải `var(--sg-base)`:

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

Đích là **key gốc** (`$blue500`, không phải `$blue-500`), phải tồn tại và đồ thị alias không được có chu trình. Không dùng alias trong `typography`.

### Trạng thái hover/active

Khai báo key anh em cạnh màu gốc: `primary`, `primaryHover`, `primaryActive`. Registry tự sinh `hover:bg-primary-hover`, `active:bg-primary-active` (và dạng `text-`/`border-`), còn `createVariantMapper(..., { states: COLOR_STATES })` gộp chúng thành một chuỗi class (xem [Design Tokens](#design-tokens-cho-component)). Tên state được kebab-case (`focusVisible` → `focus-visible:`).

### Autocomplete trong editor

```bash
yarn style-gen schema        # ghi theme.schema.json cạnh file theme
```

Thêm `"$schema": "./theme.schema.json"` vào theme để editor gợi ý key và cảnh báo key lạ.

---

## Sinh CSS và import vào Tailwind

`generate(theme, options)` trả về `{ css, tokens, schema }`. `css` là **một file duy nhất** để `@import` cạnh Tailwind — không có `@plugin`, không có file safelist:

```css
@import "tailwindcss";
@import "./theme.css";
```

Chọn một cách để ghi `theme.css`:

### Cách 1: Vite plugin (khuyến nghị)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // phải khớp đường dẫn @import trong CSS
    }),
    tailwindcss(),
  ],
});
```

Plugin ghi `theme.css` (nguyên tử) khi khởi động dev, khi build và mỗi lần lưu theme JSON. Thêm `theme.css` vào `.gitignore` nếu theme JSON là nguồn sự thật. Nuxt chạy trên Vite nên đăng ký cùng plugin trong `nuxt.config.ts → vite.plugins` (xem `examples/nuxt-v4`); ví dụ Vite + React ở `examples/react-v4`.

### Cách 2: Next.js

```typescript
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {};

export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
})(nextConfig);
```

Chạy được với webpack lẫn Turbopack, không import `next` nên không thêm peer dependency. Chỉ ghi `theme.css` khi Next nạp config ở `phase-development-server` (`next dev`, kèm watcher) hoặc `phase-production-build` (`next build`); các phase khác (`next start`, export, …) trả config mà không đọc theme. `nextConfig` có thể là object hoặc dạng hàm `(phase, { defaultConfig }) => config` (được gọi với đúng tham số của Next). Giới hạn: guard đường dẫn không `realpath` symlink. Xem `examples/next-v4`.

### Cách 3: CLI

```bash
yarn style-gen init                 # scaffold theme + theme.schema.json + script generate() + style-gen.config.json
yarn style-gen generate             # ghi styles/theme.css
yarn style-gen generate --watch     # sinh lại khi lưu
yarn style-gen doctor               # kiểm tra cấu hình, schema; cảnh báo va chạm utility và biến --sg-<màu> kiểu 4.x còn sót (quét file nguồn dưới thư mục hiện tại)
```

Không chạy CLI qua `npx`: tên `style-gen` chưa có ai giữ trên npm public nên `npx` có thể tải nhầm package lạ. Dùng npm thì chạy `npm exec --no -- style-gen`.

Flag `generate`: `--theme <path>`, `--out <path>`, `-w`/`--watch`. Thứ tự resolve cấu hình, theo từng key: flags → file config → mặc định (`styles/theme.json` → `styles/theme.css`). File config là một trong hai nguồn, chọn theo kiểu _hoặc_: `style-gen.config.json` nếu nó tồn tại, nếu không thì `package.json["style-gen"]`; hai nguồn không bao giờ được merge (`style-gen.config.json` hỏng thì bị báo lỗi chứ không rơi sang `package.json`). File config được validate bằng cùng schema với option của `generate()`: gõ sai key (`breakpoint` thay vì `breakpoints`) hay giá trị không hợp lệ thì `generate` in `Invalid config (<file>):` kèm từng dòng `path → message`, không ghi file và thoát với mã 1; `doctor` báo `Config (<file>) ❌ Invalid` và cũng thoát với mã 1. File config không parse được JSON (hỏng) thì `generate` cảnh báo rồi dùng mặc định.

Script do `init` sinh và `style-gen generate` ghi cùng một file (`output` trong config); chạy một trong hai (`node plugins/theme-plugin.ts` cần Node >= 22.18). `doctor` chỉ kiểm tra script khi config có `plugin` — setup `styleGenVite`/`styleGenNext` hay chỉ dùng CLI không cần.

### Cách 4: Script tự viết

```typescript
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "../styles/theme.json";

const theme = defineTheme(themeJson); // type-check VÀ validate lúc chạy
const options = defineOptions({
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
export { tokens };
```

### Class dựng lúc runtime

Mọi màu luôn có `bg-*`/`text-*`/`border-*` nhờ `@source inline` do registry sinh. Class bạn ghép bằng template literal thì Tailwind không quét được — khai báo bằng `extraSources`:

```typescript
generate(theme, { extraSources: ["hover:bg-{primary,secondary}"] });
```

### Thu hẹp `@source inline` theo category (`coverage`)

Mặc định mỗi category có một dòng `@source inline` phủ mọi key (màu: đủ ba tiền tố `bg-`/`text-`/`border-`). Bảng màu lớn làm dòng này dài; `coverage` thu hẹp nó theo từng category (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`):

| `coverage.<category>` | Tác dụng                                                                                                                                                                                                                                                                                      |
| :-------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| vắng, `true`, `{}`    | Đầu ra như cũ, giống từng byte.                                                                                                                                                                                                                                                               |
| `false`               | Không phát dòng `@source inline` của category, kể cả dòng state (`hover:`, `active:`).                                                                                                                                                                                                        |
| `{ prefixes: [...] }` | Chỉ giữ các tiền tố class liệt kê (`bg`, `rounded-t`, …). Mỗi tiền tố phải thuộc category đó, nếu không `generate()` ném lỗi; typography không có tiền tố (key chính là class).                                                                                                               |
| `{ keys: "aliased" }` | Chỉ giữ các key có giá trị là alias `"$<key>"` (key _giữ alias_) ở bản gốc hoặc ở bất kỳ override `themeAxes` nào; primitive mà chúng trỏ tới không cần class. Dòng state theo sau: `hover:bg-x-hover` chỉ còn khi cả `x` và `xHover` còn. Không dùng được cho `typography` (không có alias). |
| `{ keys: "all" }`     | Mặc định: mọi key.                                                                                                                                                                                                                                                                            |

`prefixes` và `keys` kết hợp được; danh sách `prefixes` phải không rỗng. Với `keys: "aliased"` mà category không có key giữ alias nào (hoặc không khai báo key) thì không phát gì: giá trị mặc định không phải alias. `coverage` chỉ cắt `@source inline`: `@theme inline`, `@utility` và `DesignTokens` có kiểu giữ nguyên, nên class còn dùng mà không còn được phủ phải xuất hiện literal trong source hoặc khai báo qua `extraSources`.

```typescript
generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    shadows: false,
  },
});
```

### Class bị trùng utility có sẵn của Tailwind

Key có class trùng utility của Tailwind (`none` trong `colors`/`shadows`/`borderRadius`, key typography thành `text-sm`, `h-1` (từ `h1`), `italic`…, màu `transparent`/`current`/`inherit`) không bị schema từ chối, nhưng rule nào thắng do Tailwind quyết định. Đặt tên khác (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` liệt kê các va chạm nó nhận ra được (chỉ là cảnh báo). Riêng `borderWidth` toàn số (`2`) không phải va chạm mơ hồ: từ 5.0 giá trị theme thay thế `border-2`, `border-x-2`, `divide-x-2` có sẵn của Tailwind (Tailwind tra theme trước thang mặc định); `doctor` vẫn báo để bạn xác nhận đó là chủ ý.

---

## Multi-axis theming

`themeAxes` ánh xạ **tên trục** → **các variant**; mỗi variant chỉ liệt kê giá trị khác base. Nhiều trục bật cùng lúc:

```json
{
  "colors": {
    "primary": "#007AFF",
    "background": "#FFFFFF",
    "foreground": "#1C1C20"
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#0A84FF",
          "background": "#000000",
          "foreground": "#FFFFFF"
        },
        "shadows": { "sm": "0px 1px 2px rgba(255, 255, 255, 0.1)" }
      }
    },
    "palette": {
      "forest": { "colors": { "primary": "#16A34A" } },
      "highContrast": { "colors": { "primary": "#000000" } }
    }
  }
}
```

CSS sinh ra (sau `:root`, theo thứ tự khai báo):

```css
html[data-theme="dark"] { … }
html[data-palette="forest"] { … }
html[data-palette="high-contrast"] { … }
```

Kích hoạt trên phần tử `<html>`:

```html
<html data-theme="dark" data-palette="high-contrast">
  …
</html>
```

Quy tắc cần nhớ:

- **Selector ghim vào `html`** (mặc định, `axes.scope: "root"`). Attribute đặt trên phần tử bọc khác không có tác dụng: alias `var()` được tính tại phần tử _khai báo_ biến (`:root`), nên override ở phần tử con không bao giờ tới được giá trị alias. Muốn theme cục bộ thì đặt `axes.scope: "element"` (xem [Đổi attribute và scope](#đổi-attribute-và-scope-axes)).
- **Giá trị attribute là dạng kebab của key**: variant `highContrast` → `data-palette="high-contrast"`; trục `colorScheme` → `data-color-scheme`.
- **Precedence = thứ tự khai báo**: hai trục cùng override một token có specificity ngang nhau, trục khai báo **sau** thắng.
- **Tên trục/variant không được là số nguyên** (`100`, `2024`): JS liệt kê key kiểu số lên đầu và phá thứ tự. Dùng `contrast100`.
- **Key override phải có ở base** — key chỉ có ở override không tạo utility nên bị từ chối lúc parse.
- **Override ghép giữa các trục** (`[data-theme="dark"][data-palette="forest"]`) và biến ngoài `--sg-*` vẫn là CSS viết tay; bảng phạm vi ở `examples/nuxt-v4/README.md`.

`--sg-*` là lớp biến trung gian để tránh vòng tham chiếu khi đổi theme. Trong code ứng dụng, ưu tiên class Tailwind chuẩn (`bg-primary`) hoặc `var(--color-primary)`. Các biến lib phát ra (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, …, và `--sg-sp-*` của spacing) là output công khai: alias trỏ vào chúng và CSS viết tay có thể đọc hoặc override chúng; đổi tên là breaking change. Bản 5.0 đã đổi biến màu từ `--sg-<màu>` thành `--sg-color-<key>`; `style-gen doctor` cảnh báo `file:line` cho mọi `var(--sg-<colorKey>)` hoặc khai báo `--sg-<colorKey>:` còn sót (xem [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)).

### Đổi attribute và scope (`axes`)

Mặc định selector là `html[data-<trục-kebab>="<variant-kebab>"]`. `options.axes` đổi tên attribute theo từng trục và cho phép bỏ ghim `html`:

```typescript
generate(theme, {
  axes: {
    attribute: { theme: "data-mode" }, // trục → tên attribute; trục không liệt kê giữ data-<trục-kebab>
    scope: "element", // "root" (mặc định) | "element"
  },
});
```

```css
[data-mode="dark"] { … }            /* scope: "element" — không có html */
html[data-palette="forest"] { … }   /* scope: "root" — mặc định */
```

- **`attribute` là bản đồ**, không phải hàm: `style-gen.config.json` ghi được. Tên phải khớp `[a-z][a-z0-9-]*` (chữ thường như mặc định `data-<trục-kebab>`; nó được nhúng vào selector). `themeAxisAttributes(state, { attribute })` của `./recipes` đọc đúng bản đồ này để DOM và CSS không lệch nhau.
- **`scope: "root"`** giữ selector ghim vào `html` như quy tắc ở trên. **`scope: "element"`** bỏ `html`, nên attribute đặt được trên phần tử bất kỳ (theme cục bộ cho một vùng).
- **Quy tắc alias khi `scope: "element"`.** Alias `"$<key>"` vẫn được tính tại phần tử _khai báo_ nó (`:root`), nên giữ giá trị gốc bên trong phần tử có attribute. `generate()` vì vậy ném `ZodError` khi một variant override một key `T` mà một entry `H` khác đang alias tới (trực tiếp hoặc qua chuỗi alias, ở mọi category), trừ khi variant đó khai báo lại chính `H` (bằng giá trị literal hoặc `"$<key>"`). Alias của `H` được tìm ở theme gốc **và** ở mọi variant khác của mọi trục (ví dụ `dark` viết `primary: "$brand"` còn `light` override `brand` mà không khai báo lại `primary`). Lỗi nằm tại key bị override (`themeAxes.<trục>.<variant>.<category>.<key>`); với chuỗi alias, mỗi mắt xích cũ được báo thành một lỗi riêng cùng path. Sửa bằng cách khai báo lại entry giữ alias trong variant, hoặc dùng `scope: "root"`.
- **Kiểm tra attribute chạy ở mọi `scope`:** key trong `attribute` phải là tên một trục của `themeAxes` (lỗi tại `axes.attribute.<trục>`), và hai trục không được cùng ra một tên attribute (ví dụ `attribute: { theme: "data-palette" }` khi có trục `palette`; lỗi tại `axes.attribute.<trục>`).
- **Variant tên `base` không bật được bằng `themeAxisAttributes`:** `"base"` nghĩa là "không override" nên không phát attribute. Đặt tên khác (`default`, `standard`) cho variant cần bật.
- `generateThemeCss(theme, options)` nhận cùng `options` ở tham số thứ hai.

---

## Spacing Helpers

Lib sinh sẵn các utility `.sp-*` (một `@utility` cho mỗi key, chuỗi fallback breakpoint nằm trong chính utility) — không cần safelist theo từng giá trị. Component chỉ set biến inline `--sg-sp-*` bằng `resolveSpacingProps`:

```tsx
import {
  resolveSpacingProps,
  type ResponsiveValueStrict,
} from "@duydpdev/style-generator/spacing";
import type { CSSProperties, ReactNode } from "react";

interface BoxProps {
  p?: ResponsiveValueStrict<number>;
  px?: ResponsiveValueStrict<number>;
  py?: ResponsiveValueStrict<number>;
  m?: ResponsiveValueStrict<number>;
  mx?: ResponsiveValueStrict<number>;
  my?: ResponsiveValueStrict<number>;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Box = ({
  p,
  px,
  py,
  m,
  mx,
  my,
  className,
  style,
  children,
}: BoxProps) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });

  return (
    <div
      className={[spacing.classNames, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    >
      {children}
    </div>
  );
};
```

```tsx
<Box p={4} />
// → class="sp-p" style="--sg-sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />
// → class="sp-p" style="--sg-sp-p: 0.5rem; --sg-sp-p-md: 1rem; --sg-sp-p-lg: 2rem"

<Box p={13.5} />
// → class="sp-p" style="--sg-sp-p: 3.375rem"

<Box gap={{ base: 4, md: 8 }} gapX={2} />
// resolveSpacingProps({ gap: …, "gap-x": 2 }) → class="sp-gap sp-gap-x"
```

- `classNames` là **chuỗi** (nối bằng dấu cách), không phải mảng.
- **Quy tắc cùng phần tử:** biến `--sg-sp-*` được đăng ký với `inherits: false`, nên class `sp-*` chỉ đọc biến khai báo trên chính phần tử đó; giá trị của phần tử cha không rò xuống con.
- Prop hợp lệ là `SpacingKey`: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`. `resolveSpacing(prop, value, unit?)` xử lý một prop; `unit` mặc định `0.25` rem.
- Chỉ breakpoint trong `options.breakpoints` (mặc định `["md", "lg"]`) mới có chuỗi fallback. Kiểu mặc định cũng chỉ nhận `md`/`lg` (`DefaultBreakpointKeys`); khi đặt `options.breakpoints` khác, truyền cùng các key đó làm tham số kiểu: `resolveSpacingProps<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`.
- Tắt bằng `spacing: { enabled: false }`; tuỳ chỉnh bằng `spacing: { properties: { inset: ["top", "bottom"] } }` (key spacing → danh sách thuộc tính CSS nó set; giá trị luôn là `var(--sg-sp-<key>)` nên không cần khai báo).
- `generate()` kiểm tra mọi option bằng một schema strict và ném `ZodError` kèm path: key lạ bị từ chối (kể cả trong `spacing` và `typography`); `enableResponsive`, `spacing.enabled`, `typography.cssVarDriven` phải là boolean; phần tử `breakpoints`, key của `screens` và `spacing.properties` theo ngữ pháp key của theme (chữ, số, `-`); mỗi giá trị `screens` phải là một độ dài px/rem/em, và bản đồ sau khi gộp với `defaultScreens` (px) chỉ được dùng một đơn vị (lỗi báo ở `screens`); mỗi phần tử `breakpoints` phải là tên một screen trong `defaultScreens` hoặc `screens` (lỗi báo ở `breakpoints.<i>`); tên thuộc tính CSS trong `spacing.properties` phải viết thường (`padding`, `column-gap`, `--custom`).

---

## Design Tokens cho Component

`generate()` trả `tokens`; cũng có thể dựng riêng, an toàn cho browser, bằng `createDesignTokens` từ `./tokens`:

```typescript
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import { cva } from "class-variance-authority";
import theme from "./styles/theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});

// createVariantMapper luôn kebab-case cùng hàm với registry, nên mọi class trả ra đều tồn tại
const button = cva("base-class", {
  variants: {
    color: createVariantMapper("bg", DesignTokens.Web.colors),
    // { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

    text: createVariantMapper("", DesignTokens.Web.typography),
    // { text16Medium: "text-16-medium", … }   ("" = class trần, dùng cho typography)
  },
});
```

**Tokens trong `DesignTokens.Web`:**

| Token               | Mô tả                                                                              |
| ------------------- | ---------------------------------------------------------------------------------- |
| `colors`            | Tất cả key màu (flat, camelCase)                                                   |
| `typography`        | Key của `typography`                                                               |
| `shadows`           | Key của `shadows`                                                                  |
| `backDropBlurs`     | Key của `backDropBlurs`                                                            |
| `fontFamily`        | Key của `fontFamily`                                                               |
| `borderWidth`       | Key của `borderWidth` (mặc định `0, 1, 2, 4` khi vắng hoặc `{}`)                   |
| `borderRadius`      | Key của `borderRadius` (mặc định `DEFAULT_ROUNDED_VALUES` khi vắng hoặc `{}`)      |
| `spacingProperties` | Danh sách spacing props — key của `options.spacing.properties` hoặc mặc định       |
| `breakpoints`       | Breakpoint đang dùng — mặc định `["md", "lg"]`                                     |
| `screens`           | Bản đồ breakpoint → độ rộng: screens mặc định cộng key của `options.screens`       |
| `aliasedColors`     | Key `colors` có giá trị là alias `"$<key>"` ở record gốc hoặc override `themeAxes` |

Tên mỗi mảng trùng với field `ThemeConfig` tương ứng (`DesignTokens.Web.colors` chứa key của `theme.colors`); `spacingProperties`, `breakpoints`, `screens` lấy từ options. Mọi mảng đều `readonly`, và options được suy ra dạng literal (`generate`, `createDesignTokens`, `defineOptions` nhận `const O`): `breakpoints: ["md", "xl"]` cho `DesignTokens.Web.breakpoints` kiểu `readonly ("md" | "xl")[]`. Options khai báo kiểu `StyleGeneratorOptions`, hoặc type argument tường minh chỉ cho theme (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`), thì hai trường này widen thành `readonly string[]`; bỏ type argument để giữ literal. Không truyền `options` thì dùng mặc định (`readonly ("md" | "lg")[]`). `aliasedColors` tính lúc chạy từ record gốc và mọi override; kiểu của nó giữ mỗi key có giá trị là literal `$…` hoặc `string`. Kiểu tương ứng: `DesignTokensWeb<TTheme, O>`, `DesignTokensResult<TTheme, O>`; `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState` gõ kiểu cho các thuộc tính `data-<axis>` (key và giá trị là key gốc trong theme, còn thuộc tính/selector được sinh ra là kebab-case: `colorMode` + `high-contrast` → `html[data-color-mode="high-contrast"]`).

### Class trạng thái

Với các key anh em `primaryHover`/`primaryActive` trong theme, `{ states }` gộp chúng vào class của key gốc:

```typescript
import {
  createVariantMapper,
  COLOR_STATES,
} from "@duydpdev/style-generator/cva";

const bg = createVariantMapper(
  "bg",
  ["primary", "primaryHover", "primaryActive", "danger"] as const,
  { states: COLOR_STATES },
);
// primary: "bg-primary hover:bg-primary-hover active:bg-primary-active"
// primaryHover: "bg-primary-hover", primaryActive: "bg-primary-active", danger: "bg-danger"
```

Luôn truyền `COLOR_STATES` thay vì gõ tay `["hover", "active"]` — đó là danh sách mà các dòng `@source inline` cũng dùng. Truyền key camelCase như `DesignTokens.Web.colors` cung cấp (`primaryHover`, không phải `primary-hover`).

`prefix` có kiểu `RegistryPrefix | ""` (các prefix mà registry phát `@source inline`; `""` dành cho typography), nên `createVariantMapper("ring", …)` hoặc prefix nằm trong biến kiểu `string` đều là lỗi kiểu: chúng ánh xạ ra class mà không dòng `@source inline` nào giữ lại. Để bỏ qua kiểm tra cho một prefix đơn lẻ, truyền `{ allowUnregisteredPrefix: true }` làm tham số thứ ba và khai báo class trong `extraSources`. Cách này không dùng cùng `{ states }` hay mảng prefix.

---

## TypeScript Tips

### `defineTheme()` — type-check và validate

```typescript
import { defineTheme } from "@duydpdev/style-generator";

const theme = defineTheme({
  colors: { primary: "#007AFF", background: "#FFFFFF" },
  typography: {
    body: {
      fontSize: "16px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
});
```

TypeScript báo lỗi ngay khi thiếu `colors`; lúc chạy `defineTheme` ném `ZodError` (có `path`) cho key lạ hoặc giá trị không an toàn. Chỉ có ở root barrel `.` — không nằm ở `./tokens`, để Zod không lọt vào các subpath dùng trên browser. `generate()` luôn validate lại nên `defineTheme` là tuỳ chọn. Để in lỗi dễ đọc, bọc lời gọi bằng `catch` rồi truyền `ZodError` cho `formatZodError` (cũng export từ `.`): hàm trả mỗi issue một dòng `path → message`.

### Semantic type aliases

```typescript
import type {
  ColorVariant,
  TextVariant,
  BorderWidthVariant,
} from "@duydpdev/style-generator/types";
import theme from "./theme.json";

type Theme = typeof theme;

type ButtonProps = {
  color?: ColorVariant<Theme>;
  borderWidth?: BorderWidthVariant<Theme>;
  textStyle?: TextVariant<Theme>;
};
```

Các alias có sẵn: `ColorVariant`, `TextVariant`, `ShadowVariant`, `BackdropBlurVariant`, `FontFamilyVariant`, `BorderWidthVariant`, `RoundedVariant`, cùng kiểu ánh xạ `DesignTokenKeys<T>`.

### Responsive value — chế độ strict duy nhất

`ResponsiveValueStrict` là kiểu responsive duy nhất; gõ sai breakpoint (`{ typo: 4 }`) là lỗi kiểu, và `base` luôn được phép:

```typescript
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";

// "base" luôn hợp lệ; mọi key còn lại phải được khai báo trong `options.breakpoints`
// và có mặt trong `screens` (hoặc `defaultScreens`), nếu không sẽ không có CSS tương ứng.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## Nâng cấp từ bản cũ

- **4.x → 5.0.0** (breaking: `--sg-color-*`, `borderWidth` qua `@theme`, `spacing.properties` dạng mảng, key `DesignTokens.Web` đổi tên, typography chặt hơn): [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md).
- **3.x → 4.0.0** (breaking: chỉ Tailwind v4, `generate()` thay plugin + safelist, schema strict, `themeAxes`, `borderWidth`, `--sg-sp-*`): [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md), gồm bảng trước/sau và runbook rollback.
- Đợt subpath exports của 3.x (lịch sử, còn yêu cầu về `moduleResolution`): [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md).
- Key `themes` một trục đã đổi tên thành `themeAxes`; theme còn dùng tên cũ bị từ chối kèm thông báo hướng dẫn đổi tên (nguyên văn trong guide migration).
- Các major cũ hơn: 2 → 3 bỏ object màu lồng nhau và key `DEFAULT` (chỉ còn key flat camelCase); 1 → 2 làm phẳng các nhóm màu `base`/`text`/`common`.
