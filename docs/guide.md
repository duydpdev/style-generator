# User Guide

Hướng dẫn tích hợp `fe-style-generator` vào dự án.

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

- [ ] (Tuỳ chọn) Cấu hình CLI qua `style-gen.config.json` để đồng bộ hoá build.

---

## Tạo Theme Config

Tạo file `theme.json` (hoặc `theme.ts`) chứa toàn bộ design tokens.

### Hybrid Theme Color System

Hệ thống màu sắc hỗ trợ cơ chế Hybrid Theme với 3 root buckets chính: `base`, `text`, và `common`.

- **`base`**: Các màu nền và màu chính của ứng dụng (primary, background, surface...).
- **`text`**: Các màu chữ (main, muted, contrast...).
- **`common`**: Các màu dùng chung (border, outline, status...).

### Nested Colors & `DEFAULT` key

Bạn có thể lồng các object để tổ chức màu sắc tốt hơn. Sử dụng key `DEFAULT` để định nghĩa màu cơ sở cho một nhóm mà không cần thêm hậu tố vào tên CSS variable hay class name.

```json
{
  "colors": {
    "base": {
      "primary": {
        "DEFAULT": "#007AFF",
        "50": "#F2F7FF",
        "500": "#007AFF",
        "900": "#003A7A"
      }
    },
    "text": {
      "main": "#1C1C20"
    }
  }
}
```

**Kết quả CSS Variables:**

- `primary.DEFAULT` -> `--color-base-primary: #007aff`
- `primary.500` -> `--color-base-primary-500: #007aff`
- `text.main` -> `--color-text-main: #1c1c20`

**Kết quả Tailwind Utility:**

- `bg-base-primary`, `text-text-main`, `border-common-border`...

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
  "shadows": {
    "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)"
  },
  "backDropBlurs": {
    "sm": "4px"
  },
  "borderRadius": {
    "md": "8px"
  }
}
```

**Các trường bắt buộc:** `colors.base`, `colors.text`, `typography`

**Các trường tuỳ chọn:** `shadows`, `backDropBlurs`, `borderRadius`, `border`, `themes`

---

## Tích hợp Tailwind v4

### Bước 1 — Tạo plugin file

Tạo file `src/plugins/theme-plugin.ts`:

```typescript
import fs from "node:fs";
import path, { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { createStyleSystem, Breakpoint } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { plugin, safelist } = createStyleSystem(theme, {
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

// Export plugin để Tailwind v4 @plugin directive dùng
export default plugin;

// Script: chạy trực tiếp để generate file safelist.txt
if (process.argv[1] === __filename) {
  const outPath = path.resolve(__dirname, "../styles/safelist.txt");
  fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
  console.log(`✅ Safelist generated (${safelist.length} classes)`);
}
```

### Bước 2 — Generate safelist file

```bash
npx tsx src/plugins/theme-plugin.ts
```

### Bước 3 — Import trong CSS

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "./styles/safelist.txt";
```

---

## Tích hợp Tailwind v3

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";
import { createStylePlugin, Breakpoint } from "@duydpdev/style-generator";
import theme from "./styles/theme.json";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  plugins: [
    createStylePlugin(theme, {
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG],
    }) as any,
  ],
};

export default config;
```

---

## Multi-theme

Để hỗ trợ nhiều theme (ví dụ dark mode), thêm key `themes` vào theme config. Mỗi theme chỉ cần khai báo **giá trị khác** so với default:

```json
{
  "colors": {
    "base": { "primary": "#007AFF", "background": "#FFFFFF" },
    "text": { "main": "#1C1C20" }
  },
  "themes": {
    "dark": {
      "colors": {
        "base": { "background": "#000000" },
        "text": { "main": "#FFFFFF" }
      },
      "shadows": {
        "sm": "0px 1px 2px rgba(255, 255, 255, 0.1)"
      }
    },
    "high-contrast": {
      "colors": {
        "text": { "main": "#000000" }
      }
    }
  }
}
```

**Output CSS được tạo tự động:**

```css
:root {
  --color-base-primary: #007aff;
  --color-base-background: #ffffff;
  --color-text-main: #1c1c20;
}

html[data-theme="dark"] {
  --color-base-background: #000000;
  --color-text-main: #ffffff;
  --shadow-sm: 0px 1px 2px rgba(255, 255, 255, 0.1);
}

html[data-theme="high-contrast"] {
  --color-text-main: #000000;
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

Thay vì dùng safelist (tốn nhiều class), spacing sử dụng CSS custom properties. Plugin tự động tạo các utility class `.sp-*`.

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

// Giá trị tự do (không bị giới hạn safelist)
<Box p={13.5} />
// → class="sp-p" style="--sp-p: 3.375rem"
```

### API

| Hàm                                  | Mô tả                                                     |
| ------------------------------------ | --------------------------------------------------------- |
| `resolveSpacing(prop, value, unit?)` | Resolve một spacing prop thành `{ className, style }`     |
| `resolveSpacingProps(props)`         | Resolve nhiều spacing props thành `{ classNames, style }` |

**Spacing properties mặc định:** `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`

---

## Design Tokens cho Component

`createDesignTokens` trả về object chứa các mảng token keys, dùng để định nghĩa prop types cho UI Components (ví dụ với `cva`):

```typescript
import { createDesignTokens } from "@duydpdev/style-generator";
import theme from "./styles/theme.json";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});

// Sử dụng với cva
import { cva } from "class-variance-authority";

const button = cva("base-class", {
  variants: {
    color: DesignTokens.Web.variantColor.reduce((acc, c) => {
      acc[c] = `bg-${c}`;
      return acc;
    }, {}),
    textVariant: DesignTokens.Web.variantText.reduce((acc, t) => {
      acc[t] = t;
      return acc;
    }, {}),
  },
});
```

**Tokens có sẵn trong `DesignTokens.Web`:**

| Token                 | Mô tả                                               |
| --------------------- | --------------------------------------------------- |
| `variantColor`        | Keys của `colors.base` + `colors.text` (kebab-case) |
| `variantText`         | Keys của `typography`                               |
| `variantTextColor`    | Keys của `colors.text`                              |
| `variantShadow`       | Keys của `shadows`                                  |
| `variantBackdropBlur` | Keys của `backDropBlurs`                            |
| `borderOption`        | Keys của `border`                                   |
| `roundedOption`       | Keys của `borderRadius`                             |
| `spacingProperties`   | Danh sách spacing props                             |
| `breakpoints`         | Breakpoints đang dùng                               |

---

## TypeScript Tips

### Vấn đề chính

Khi import `theme.json`, TypeScript sẽ suy luận kiểu là `string` thay vì literal union type, làm giảm hiệu quả autocomplete.

### Giải pháp 1 — Dùng `theme.ts` với `as const`

```typescript
// styles/theme.ts
const theme = {
  colors: {
    base: { primary: "#007AFF", white: "#FFFFFF" } as const,
    text: { main: "#1C1C20" } as const,
  },
  typography: {
    /* ... */
  } as const,
} as const;

export default theme;
```

### Giải pháp 2 — Ép kiểu khi truyền vào hàm

```typescript
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme as const, options);
```

### Kết quả kỳ vọng

Với cách trên, TypeScript sẽ infer chính xác:

```typescript
// ✅ Đúng: TS báo lỗi rõ ràng
const color: (typeof DesignTokens.Web.variantColor)[number] = "invalid";
// Error: Type '"invalid"' is not assignable to type '"primary" | "white" | "main" | ...'
```
