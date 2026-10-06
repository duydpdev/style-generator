# User Guide

Hướng dẫn tích hợp `@duydpdev/style-generator` 4.0.0 vào dự án **Tailwind CSS v4**. Tra cứu đầy đủ (option, export, CLI) nằm ở [`README.md`](../README.md); đang nâng cấp từ 3.x thì đọc [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

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

Package được publish lên GitHub Packages (private); cấu hình `.npmrc` theo mục Installation của [`README.md`](../README.md), rồi:

```bash
yarn add @duydpdev/style-generator
```

**Peer dependencies:** `tailwindcss >=4.1.0` (Tailwind v3 không còn được hỗ trợ), `typescript ^5`, và `vite` (tuỳ chọn, chỉ khi dùng `styleGenVite`). `zod` là dependency thường của package — không cần cài riêng.

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

| Field           | Sinh ra                                                            |
| --------------- | ------------------------------------------------------------------ |
| `colors`        | `bg-*`, `text-*`, `border-*` (bắt buộc)                            |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)        |
| `shadows`       | `shadow-*`                                                         |
| `backDropBlurs` | `backdrop-blur-*`                                                  |
| `borderRadius`  | `rounded-*` (+ biến thể `md:`/`lg:` theo breakpoint đang bật)      |
| `fontFamily`    | `font-*` qua namespace `--font-*` của Tailwind                     |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l` (thay cho key `border` của bản 3.x) |
| `themeAxes`     | override theo trục (xem [Multi-axis theming](#multi-axis-theming)) |

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
- Hai key ở hai category khác nhau mà cho ra cùng một biến CSS bị từ chối (`colors.shadowPrimary` và `shadows.primary` đều thành `--sg-shadow-primary`; lỗi báo ở key khai báo sau và nêu tên cả hai). Namespace `--sg-sp-*` dành riêng cho spacing: key màu như `spP` (thành `--sg-sp-p`) bị từ chối.

### Alias `$key`

Giá trị `"$<key>"` trỏ tới key khác **cùng category** và được phát thành `var(--sg-<key>)`, nên không phải lặp mã hex:

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
yarn style-gen doctor               # kiểm tra cấu hình, schema và cảnh báo va chạm utility
```

Không chạy CLI qua `npx`: tên `style-gen` chưa có ai giữ trên npm public nên `npx` có thể tải nhầm package lạ. Dùng npm thì chạy `npm exec --no -- style-gen`.

Flag `generate`: `--theme <path>`, `--out <path>`, `-w`/`--watch`. Thứ tự resolve cấu hình: flags → `style-gen.config.json` → `package.json["style-gen"]` → mặc định (`styles/theme.json` → `styles/theme.css`). File config được validate bằng cùng schema với option của `generate()`: gõ sai key (`breakpoint` thay vì `breakpoints`) hay giá trị không hợp lệ thì `generate` in `Invalid config (<file>):` kèm từng dòng `path → message`, không ghi file và thoát với mã 1; `doctor` báo `Config (<file>) ❌ Invalid` và cũng thoát với mã 1. File config không parse được JSON (hỏng) thì `generate` cảnh báo rồi dùng mặc định.

Script do `init` sinh và `style-gen generate` ghi cùng một file (`output` trong config); chạy một trong hai (`node plugins/theme-plugin.ts` cần Node 24). `doctor` chỉ kiểm tra script khi config có `plugin` — setup `styleGenVite`/`styleGenNext` hay chỉ dùng CLI không cần.

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

### Class bị trùng utility có sẵn của Tailwind

Key có class trùng utility của Tailwind (`none` trong `colors`/`shadows`/`borderRadius`, `borderWidth` toàn số, key typography thành `text-sm`, `h-1` (từ `h1`), `italic`…, màu `transparent`/`current`/`inherit`) không bị schema từ chối, nhưng rule nào thắng do Tailwind quyết định. Đặt tên khác (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` liệt kê các va chạm nó nhận ra được (chỉ là cảnh báo).

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

- **Selector ghim vào `html`.** Attribute đặt trên phần tử bọc khác không có tác dụng: alias `var()` được tính tại phần tử _khai báo_ biến (`:root`), nên override ở phần tử con không bao giờ tới được giá trị alias.
- **Giá trị attribute là dạng kebab của key**: variant `highContrast` → `data-palette="high-contrast"`; trục `colorScheme` → `data-color-scheme`.
- **Precedence = thứ tự khai báo**: hai trục cùng override một token có specificity ngang nhau, trục khai báo **sau** thắng.
- **Tên trục/variant không được là số nguyên** (`100`, `2024`): JS liệt kê key kiểu số lên đầu và phá thứ tự. Dùng `contrast100`.
- **Key override phải có ở base** — key chỉ có ở override không tạo utility nên bị từ chối lúc parse.
- **Override ghép giữa các trục** (`[data-theme="dark"][data-palette="forest"]`) và biến ngoài `--sg-*` vẫn là CSS viết tay; bảng phạm vi ở `examples/nuxt-v4/README.md`.

`--sg-*` là lớp biến trung gian nội bộ để tránh vòng tham chiếu khi đổi theme; code của bạn chỉ dùng class Tailwind chuẩn (`bg-primary`) hoặc `var(--color-primary)`, không dùng `--sg-*` trực tiếp.

---

## Spacing Helpers

Lib sinh sẵn các utility `.sp-*` (một `@utility` cho mỗi key, chuỗi fallback breakpoint nằm trong chính utility) — không cần safelist theo từng giá trị. Component chỉ set biến inline `--sg-sp-*` bằng `resolveSpacingProps`:

```tsx
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

const Box = ({ p, px, py, m, mx, my, className, style, children }) => {
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
- Tắt bằng `spacing: { enabled: false }`; tuỳ chỉnh bằng `spacing: { properties: { … } }` (map prop → khai báo CSS).
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
    color: createVariantMapper("bg", DesignTokens.Web.variantColor),
    // { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", … }

    text: createVariantMapper("", DesignTokens.Web.variantText),
    // { text16Medium: "text-16-medium", … }   ("" = class trần, dùng cho typography)
  },
});
```

**Tokens trong `DesignTokens.Web`:**

| Token                 | Mô tả                                                      |
| --------------------- | ---------------------------------------------------------- |
| `variantColor`        | Tất cả key màu (flat, camelCase)                           |
| `variantText`         | Key của `typography`                                       |
| `variantShadow`       | Key của `shadows`                                          |
| `variantBackdropBlur` | Key của `backDropBlurs`                                    |
| `variantFontFamily`   | Key của `fontFamily`                                       |
| `borderWidthOption`   | Key của `borderWidth` (mặc định `0, 1, 2, 4`)              |
| `roundedOption`       | Key của `borderRadius` (mặc định `DEFAULT_ROUNDED_VALUES`) |
| `spacingProperties`   | Danh sách spacing props                                    |
| `breakpoints`         | Breakpoint đang dùng — mặc định `["md", "lg"]`             |
| `screens`             | Bản đồ breakpoint → độ rộng                                |

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

Luôn truyền `COLOR_STATES` thay vì gõ tay `["hover", "active"]` — đó là danh sách mà các dòng `@source inline` cũng dùng. Truyền key camelCase như `DesignTokens.Web.variantColor` cung cấp (`primaryHover`, không phải `primary-hover`).

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

type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop"; // "base" luôn hợp lệ
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## Nâng cấp từ bản cũ

- **3.x → 4.0.0** (breaking: chỉ Tailwind v4, `generate()` thay plugin + safelist, schema strict, `themeAxes`, `borderWidth`, `--sg-sp-*`): [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md), gồm bảng trước/sau và runbook rollback.
- Đợt subpath exports của 3.x (lịch sử, còn yêu cầu về `moduleResolution`): [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md).
- Key `themes` một trục đã đổi tên thành `themeAxes`; theme còn dùng tên cũ bị từ chối kèm thông báo hướng dẫn đổi tên (nguyên văn trong guide migration).
- Các major cũ hơn: 2 → 3 bỏ object màu lồng nhau và key `DEFAULT` (chỉ còn key flat camelCase); 1 → 2 làm phẳng các nhóm màu `base`/`text`/`common`.
