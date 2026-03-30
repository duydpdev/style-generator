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

### Bước 1 — Tạo plugin file

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
  // safelistColors: true,  // Thêm vào safelist nếu không dùng @theme inline
});

export default plugin;
export { safelist, themeCss };
```

### Bước 2 — (Optional) Generate `theme.css` với `@theme inline`

```typescript
// scripts/generate-theme-css.ts
import fs from "node:fs";
import { generateThemeCss } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

fs.writeFileSync("styles/theme.css", generateThemeCss(theme), "utf8");
console.log("✅ theme.css generated");
```

### Bước 3 — Import trong CSS

```css
@import "tailwindcss";
@import "./theme.css"; /* @theme inline — sinh bg-primary, text-primary, v.v. */
@plugin "./src/plugins/theme-plugin.ts";
@source "./styles/safelist.txt";
```

Nếu không dùng `theme.css`, đặt `safelistColors: true` để có color classes trong safelist.

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

Plugin tự động tạo các utility class `.sp-*` với CSS custom properties.

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
```

**Spacing properties mặc định:** `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`

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
