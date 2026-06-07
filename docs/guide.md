# User Guide

Hướng dẫn tích hợp `@duydpdev/style-generator` v2 vào dự án.

## Mục lục

1. [Cài đặt](#cài-đặt)
2. [Tạo Theme Config](#tạo-theme-config)
3. [Tích hợp Tailwind v4](#tích-hợp-tailwind-v4)
4. [Tích hợp Tailwind v3](#tích-hợp-tailwind-v3)
5. [Multi-theme](#multi-theme)
6. [Spacing Helpers](#spacing-helpers)
7. [Design Tokens cho Component](#design-tokens-cho-component)
8. [TypeScript Tips](#typescript-tips)

---

## Cài đặt

```bash
yarn add @duydpdev/style-generator
```

**Peer dependencies cần có:**

```bash
yarn add tailwindcss typescript
```

---

## Tạo Theme Config

Tạo file `styles/theme.json` chứa toàn bộ design tokens.

### Color System — camelCase Keys

Tất cả màu sắc nằm trong một **flat object**. Keys dùng **camelCase** hoặc **kebab-case**, lib tự convert sang kebab-case chuẩn Tailwind.

```json
{
  "colors": {
    "primary": "#007AFF",
    "primaryForeground": "#FFFFFF",
    "sidebarForeground": "#111827",
    "background": "#FFFFFF",
    "muted": "#8E8E93",
    "blue500": "#3B82F6"
  }
}
```

**Convention camelCase → kebab-case:**

| Theme key (camelCase) | CSS Variable                 | Tailwind class            |
| --------------------- | ---------------------------- | ------------------------- |
| `primaryForeground`   | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground`   | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`             | `--color-blue-500`           | `border-blue-500`         |
| `primary`             | `--color-primary`            | `text-primary`            |

> **Quy tắc:** letter→digit tự động thêm dash (`blue500` → `blue-500`). Digit-prefix giữ nguyên (`2xl` → `2xl`).

**Kết quả CSS Variables (v3 mode):**

```css
:root {
  --color-primary: #007aff;
  --color-sidebar-foreground: #111827;
  --color-blue-500: #3b82f6;
}
```

**Kết quả `@theme inline` (v4 mode, qua `generateThemeCss`):**

```css
@theme inline {
  --color-primary: var(--sg-primary);
  --color-sidebar-foreground: var(--sg-sidebar-foreground);
  --color-blue-500: var(--sg-blue-500);
}
```

Khi có `@theme inline`, Tailwind v4 tự sinh `bg-primary`, `text-primary`, `border-primary`, `ring-primary`, v.v. — không cần safelist.

### Typography

```json
{
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
  "borderRadius": { "md": "8px" }
}
```

**Các trường bắt buộc:** `colors`, `typography`

**Các trường tuỳ chọn:** `shadows`, `backDropBlurs`, `borderRadius`, `border`, `themes`

---

## Tích hợp Tailwind v4

### Cách 1: Vite Plugin (Khuyến nghị)

**Bước 1** — Cài đặt Vite (nếu chưa):

```bash
yarn add -D vite
```

**Bước 2** — Config Vite plugin:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme",
      options: { tailwindVersion: 4 },
    }),
    // Tailwind plugin sau styleGenVite
    // import tailwindcss plugin nếu sử dụng
  ],
});
```

**Bước 3** — Import trong CSS:

```css
@import "tailwindcss";
@import "./theme.css"; /* Tự động phát sinh bởi plugin */
@plugin "./src/plugins/theme-plugin.ts";
@source "./styles/safelist.txt"; /* Tự động phát sinh bởi plugin */
```

Plugin tự động phát sinh `theme.css` (HMR-enabled) + `safelist.txt` khi lưu theme JSON.

> **Example tham khảo:** `examples/react-v4` (Vite + React). Nuxt 3 cũng chạy trên Vite — `examples/nuxt-v4` đăng ký `styleGenVite` trong `nuxt.config.ts → vite.plugins`, không cần script riêng.

### Cách 2: Manual Script (Dùng khi không có Vite)

**Bước 1** — Tạo plugin file:

```typescript
// src/plugins/theme-plugin.ts
import {
  createStyleSystem,
  Breakpoint,
  defineTheme,
} from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

const { plugin, safelist, themeCss } = createStyleSystem(defineTheme(theme), {
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

export default plugin;
export { safelist, themeCss };
```

**Bước 2** — Generate `theme.css`:

```typescript
// scripts/generate-theme-css.ts
import fs from "node:fs";
import { generateThemeCss } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

fs.writeFileSync("styles/theme.css", generateThemeCss(theme), "utf8");
console.log("✅ theme.css generated");
```

**Bước 3** — Import trong CSS:

```css
@import "tailwindcss";
@import "./theme.css"; /* @theme inline — sinh bg-primary, text-primary, v.v. */
@plugin "./src/plugins/theme-plugin.ts";
@source "./styles/safelist.txt";
```

> **Example tham khảo:** `examples/next-v4` (Next.js 15 App Router — webpack/turbopack, không Vite). Script `scripts/generate-theme.mjs` được chain qua `yarn generate:theme && next build` (Yarn Berry bỏ qua `pre`/`post` hooks nên phải chain tường minh, không dùng `prebuild`).

---

## Tích hợp Tailwind v3

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";
import {
  createStylePlugin,
  Breakpoint,
  defineTheme,
} from "@duydpdev/style-generator";
import theme from "./styles/theme.json";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [
    createStylePlugin(defineTheme(theme), {
      tailwindVersion: 3,
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG],
    }) as never,
  ],
};

export default config;
```

Với v3, plugin tự động:

- Inject CSS variables vào `:root`
- Đăng ký `theme.extend.colors` với `var()` references
- Sinh typography utilities

---

## Multi-theme

```json
{
  "colors": {
    "primary": "#007AFF",
    "background": "#FFFFFF",
    "foreground": "#1C1C20"
  },
  "themes": {
    "dark": {
      "colors": {
        "primary": "#0A84FF",
        "background": "#000000",
        "foreground": "#FFFFFF"
      },
      "shadows": {
        "sm": "0px 1px 2px rgba(255, 255, 255, 0.1)"
      }
    }
  }
}
```

**CSS được tạo tự động:**

```css
:root {
  --color-primary: #007aff;
  --color-background: #ffffff;
  --color-foreground: #1c1c20;
}

html[data-theme="dark"] {
  --color-primary: #0a84ff;
  --color-background: #000000;
  --color-foreground: #ffffff;
  --shadow-sm: 0px 1px 2px rgba(255, 255, 255, 0.1);
}
```

**Kích hoạt theme:**

```html
<html data-theme="dark">
  ...
</html>
```

---

## Spacing Helpers

Plugin tự động tạo các utility class `.sp-*` với CSS custom properties. Từ **v3.1+**, `generateSafelist()` tự động bao gồm tất cả `sp-<key>` classes (mặc định).

### Trong Component

```tsx
import { resolveSpacingProps } from "@duydpdev/style-generator";

const Box = ({ p, px, py, m, mx, my, className, children }) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });

  return (
    <div
      className={[...spacing.classNames, className].join(" ")}
      style={spacing.style}
    >
      {children}
    </div>
  );
};
```

**Ví dụ sử dụng:**

```tsx
// Đơn giản
<Box p={4} />
// → class="sp-p" style="--sp-p: 1rem"

// Responsive
<Box p={{ base: 2, md: 4, lg: 8 }} />
// → class="sp-p" style="--sp-p: 0.5rem; --sp-p-md: 1rem; --sp-p-lg: 2rem"

// Giá trị tự do
<Box p={13.5} />
// → class="sp-p" style="--sp-p: 3.375rem"

// Gap responsive (từ v3.1+)
<Box gap={{ base: 4, md: 8 }} gapX={2} />
// → class="sp-gap sp-gap-x" style="--sp-gap: 1rem; --sp-gap-md: 2rem; --sp-gap-x: 0.5rem"
```

**Spacing properties mặc định:** `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gapX`, `gapY`, `top`, `right`, `bottom`, `left`

**Tắt/tùy chỉnh safelist spacing:**

```typescript
const { safelist } = createStyleSystem(theme, {
  spacing: {
    enabled: false, // Tắt auto-include sp-* classes
    properties: { p: true, m: false }, // Chỉ include sp-p
  },
});
```

---

## Design Tokens cho Component

`createDesignTokens` trả về mảng token keys dùng để định nghĩa prop types cho UI Components.

```typescript
import {
  createDesignTokens,
  createVariantMapper,
} from "@duydpdev/style-generator";
import { cva } from "class-variance-authority";
import theme from "./styles/theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});

// createVariantMapper chuyển camelCase token → kebab-case Tailwind class tự động
// "sidebarForeground" → "bg-sidebar-foreground"
// "blue500"           → "bg-blue-500"
const button = cva("base-class", {
  variants: {
    color: createVariantMapper("bg", DesignTokens.Web.variantColor),
    // Result: { primary: "bg-primary", sidebarForeground: "bg-sidebar-foreground", ... }

    text: createVariantMapper("", DesignTokens.Web.variantText),
    // Result: { text16Medium: "text-16-medium", bodyLg: "body-lg", ... }
  },
});
```

**Tokens có sẵn trong `DesignTokens.Web`:**

| Token                 | Mô tả                               |
| --------------------- | ----------------------------------- |
| `variantColor`        | Tất cả color keys (flat, camelCase) |
| `variantText`         | Keys của `typography`               |
| `variantShadow`       | Keys của `shadows`                  |
| `variantBackdropBlur` | Keys của `backDropBlurs`            |
| `borderOption`        | Keys của `border`                   |
| `roundedOption`       | Keys của `borderRadius`             |
| `spacingProperties`   | Danh sách spacing props đang dùng   |
| `breakpoints`         | Breakpoints đang dùng               |
| `screens`             | Bản đồ breakpoint → giá trị pixel   |

---

## TypeScript Tips

### Dùng `defineTheme()` để có type-check đầy đủ

```typescript
import { defineTheme } from "@duydpdev/style-generator";

const theme = defineTheme({
  colors: {
    primary: "#007AFF",
    background: "#FFFFFF",
  },
  typography: {
    body: {
      fontSize: "16px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
});
// TypeScript báo lỗi ngay khi thiếu field bắt buộc
```

### Semantic Type Aliases (v3.1+)

Dùng semantic variant aliases để tránh deep `typeof DesignTokens.Web.X[number]` indexing:

```typescript
import type {
  ColorVariant,
  TextVariant,
  BorderVariant,
} from "@duydpdev/style-generator";
import type { Theme } from "./theme/design-tokens";

type ButtonProps = {
  color?: ColorVariant<Theme>;
  borderStyle?: BorderVariant<Theme>;
  textStyle?: TextVariant<Theme>;
};
```

Không cần `defineTheme()` nếu theme là file JSON — dùng `typeof`:

```typescript
import theme from "./theme.json";

type MyColorVariant = ColorVariant<typeof theme>;
```

### Custom Breakpoints Intellisense

```ts
// types.ts
import { ResponsiveValue as LibResponsiveValue } from "@duydpdev/style-generator";

export type AppBreakpoints =
  | "base"
  | "mobile"
  | "tablet"
  | "laptop"
  | "desktop";
export type ResponsiveValue<T> = LibResponsiveValue<T, AppBreakpoints>;
```

### Responsive Value (Strict Mode)

Dùng `ResponsiveValueStrict` để stricter typing (chỉ accept chính xác breakpoint keys):

```typescript
import { ResponsiveValueStrict } from "@duydpdev/style-generator";

const props: {
  padding: ResponsiveValueStrict<number, "md" | "lg">;
} = {
  padding: { base: 4, md: 8, lg: 16 }, // ✅ Exact keys
};

// ❌ const props = { padding: { base: 4, md: 8, unknownBreak: 10 } };
```

---

## Migration

### v2 → v3 (breaking)

**Colors:** Nested color objects và `DEFAULT` key bị xóa — chỉ còn flat keys.

```json
// v2 (cũ) — nested không còn support
{
  "colors": {
    "sidebar": { "DEFAULT": "#F9FAFB", "foreground": "#111" }
  }
}

// v3 (mới) — flat camelCase
{
  "colors": {
    "sidebar": "#F9FAFB",
    "sidebarForeground": "#111"
  }
}
```

**CVA usage:** Dùng `createVariantMapper` thay vì string interpolation thủ công (vì `variantColor` trả về camelCase, không phải kebab-case).

```ts
// v2 (sai — class sẽ là "bg-sidebarForeground")
acc[c] = `bg-${c}`;

// v3 (đúng — tự convert sang "bg-sidebar-foreground")
createVariantMapper("bg", DesignTokens.Web.variantColor);
```

### v1 → v2

```json
// v1 (cũ)
{ "colors": { "base": { "primary": "#007AFF" }, "text": { "main": "#111" } } }

// v2 (mới) — flat
{ "colors": { "primary": "#007AFF", "main": "#111" } }
```

Options bị xóa: `colorNamingMode`, `disableColorPrefix`, `enableCssVariables`
Options mới: `safelistColors`, `tailwindVersion`
Return mới từ `createStyleSystem`: thêm `themeCss`

Chạy `npx style-gen doctor` để phát hiện format cũ tự động.
