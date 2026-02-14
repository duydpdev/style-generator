# FE Style Generator

Library giúp tự động tạo **Design System** cho Tailwind CSS từ file cấu hình (Theme Config).
Hỗ trợ cả **Tailwind CSS v4** và **v3**.

## Tính năng

- 🎨 **Theme Config**: Định nghĩa màu sắc, typography, spacing, shadows, v.v. từ một nơi duy nhất.
- ⚡ **Tailwind v4 Support**: Tương thích hoàn toàn với `@plugin` và `@source`.
- 🔄 **Backward Compatibility**: Hỗ trợ Tailwind v3 config truyền thống.
- 🛡️ **Smart Safelist**: Tự động safelist các dynamic classes (ví dụ: `text-primary`, `m-4`, `md:p-8`) để tránh bị purge.
- 📱 **Dynamic & Custom Breakpoints**: Hỗ trợ override screens width và chọn breakpoints cần safelist.

---

## 1. Cài đặt

```bash
yarn add @duydp.dev/style-generator
# hoặc
npm install @duydp.dev/style-generator
```

---

## 2. Chuẩn bị Config

#### Advanced Options

You can control which modules are generated and which ones have responsive variants to optimize the safelist size.

```typescript
createStylePlugin(theme, {
  // ... other options

  // Whitelist modules to generate (default: all)
  modules: ["spacing", "layout", "typography", "colors", "rounded"],

  // Whitelist modules to generate responsive classes for (e.g. md:m-4)
  // Default: ["spacing", "layout", "typography", "rounded"]
  // Colors, shadows, borders, etc. are static by default to save size.
  responsiveModules: ["spacing", "layout"], 
});
```

### Options Reference

| Option | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `breakpoints` | `(string \| Breakpoint)[]` | `["md", "lg"]` | List of breakpoints to generate responsive prefixes for. |
| `screens` | `Record<string, string>` | - | Custom screens to override or extend Tailwind default screens. |
| `modules` | `string[]` | `undefined` (All) | List of modules to generate. Available: `spacing`, `layout`, `typography`, `colors`, `borders`, `shadows`, `rounded`, `backdrop`, `opacity`, `zIndex`. |
| `responsiveModules` | `string[]` | `["spacing", "layout", "typography", "rounded"]` | List of modules to generate responsive variants for. |

### Options (Breakpoints & Screens)

Bạn có thể cấu hình breakpoints thông qua arguments thứ 2 của plugin:

- **`screens`**: Định nghĩa custom width (override mặc định Tailwind).
- **`breakpoints`**: Danh sách key breakpoints sẽ được generate trong safelist.

## Development Config (Design Tokens)

Tạo file `theme.json` (hoặc `.ts`) chứa cấu hình design tokens (Màu, Typography, Sizes...):

```json
/* theme.json */
{
  "colors": {
    "base": { "primary": "#3B82F6", "secondary": "#6366F1" },
    "text": { "main": "#111827", "muted": "#6B7280" }
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "lineHeight": "24px",
      "fontWeight": 500,
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.05)" },
  "borderRadius": { "md": "0.375rem" }
}
```

### Options (Breakpoints & Screens)

Bạn có thể cấu hình breakpoints thông qua arguments thứ 2 của plugin:

- **`screens`**: Định nghĩa custom width (override mặc định Tailwind).
- **`breakpoints`**: Danh sách key breakpoints sẽ được generate trong safelist.

---

## 3. Sử dụng với Tailwind CSS v4

### Bước 1: Tạo Script Plugin (`src/plugins/theme-plugin.ts`)

Sử dụng hàm **`createStyleSystem`** để nhận về cả plugin và safelist generator với cùng một cấu hình.

```typescript
import { createStyleSystem, Breakpoint } from "@duydp.dev/style-generator";
import theme from "../styles/theme.json";
import fs from "fs";
import path from "path";

// Cấu hình Options (Dùng chung cho cả Plugin và Safelist)
const options = {
  // 1. Override hoặc thêm screens mới
  screens: {
    md: "800px",
    "3xl": "1920px"
  },
  // 2. Chọn breakpoints để safelist
  breakpoints: [Breakpoint.SM, Breakpoint.MD, Breakpoint.LG, "3xl"] 
};

// Tạo system (plugin + safelist)
const { plugin, safelist } = createStyleSystem(theme, options);

// Export plugin cho Tailwind v4
export default plugin;

// Script generate safelist.txt (chạy riêng)
if (require.main === module) {
  const outPath = path.resolve(__dirname, "../styles/safelist.txt");
  fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
  console.log("✅ Safelist generated!");
}
```

### Bước 2: Import vào CSS (`src/index.css`)

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "./safelist.txt";
```

---

## 4. Sử dụng với Tailwind CSS v3

```typescript
import type { Config } from "tailwindcss";
import { createStylePlugin, Breakpoint } from "@duydp.dev/style-generator";
import theme from "./theme.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: { extend: {} },
  plugins: [
    createStylePlugin(theme, {
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG]
    }),
  ],
};

export default config;
```

---

## 5. Exports API

| Hàm | Input | Mô tả |
| --- | --- | --- |
| `createStylePlugin` | `(theme, options?)` | Tạo Tailwind Plugin. Inject CSS variables, setup screens, typography. |
| `createStyleSystem` | `(theme, options?)` | **Recommended**. Trả về `{ plugin, safelist }`. Giúp đồng bộ config. |
| `generateSafelist` | `(theme, options?)` | Sinh danh sách class `string[]` cần safelist. |
| `createDesignTokens` | `(theme, options?)` | Sinh object design tokens (bao gồm cả screens info). |

### StyleGeneratorOptions

| Property | Type | Default | Mô tả |
| --- | --- | --- | --- |
| `breakpoints` | `(Breakpoint \| string)[]` | `["md", "lg"]` | List các prefix responsive sẽ được safelist (vd: `md:`, `lg:`). |
| `screens` | `Record<string, string>` | `undefined` | Custom screens map để override mặc định Tailwind (vd: `{ md: "800px" }`). |
