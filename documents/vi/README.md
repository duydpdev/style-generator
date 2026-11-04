<!-- source: README.md sha256: b32f3cb52805 -->

# @duydpdev/style-generator

[English](../../README.md) · **Tiếng Việt**

Thư viện TypeScript + CLI biến một file theme JSON thành một **design system hoàn chỉnh cho Tailwind CSS v4**: một file CSS được sinh ra (biến theme, override dark mode/palette, utility cho typography và spacing, phần phủ class `@source inline`), design token có kiểu, và một JSON Schema để editor tự gợi ý.

Được phát hành trên **GitHub Packages** với tên `@duydpdev/style-generator` (cài đặt cần token, xem [Cài đặt](#cài-đặt)).

> **Mới ở 5.2.0:** `style-gen init` nhận diện Vite, Next.js hoặc Nuxt và in ra đoạn mã plugin cho file config của bạn thay vì tạo sẵn `plugins/theme-plugin.ts`; `--plugin` đã bị bỏ. Key `plugin` trong một `style-gen.config.json` có sẵn vẫn được nạp. Xem [`style-gen init`](./reference/cli.md#style-gen-init).
>
> **Nâng cấp từ 4.x?** 5.0.0 là bản phát hành có thay đổi phá vỡ tương thích (breaking change): biến màu `--sg-<color>` → `--sg-color-<color>`, `borderWidth` chạy theo `@theme`, `spacing.properties` dạng mảng, các key của `DesignTokens.Web` đổi theo key của theme, mảng token readonly và có kiểu theo options, typography chặt chẽ hơn. Đọc [`documents/vi/migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md).
>
> **Nâng cấp từ 3.x?** 4.0.0 là bản phát hành có thay đổi phá vỡ tương thích (breaking change): chỉ hỗ trợ Tailwind v4, dùng `generate()` thay cho plugin + safelist, schema theme chặt chẽ, có `themeAxes`. Đọc [`documents/vi/migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

## Tính năng

- 🎨 **Theme config phẳng** — mọi màu nằm trong một namespace camelCase, được kiểm tra hợp lệ bằng một schema Zod chặt chẽ (key lạ và giá trị không an toàn đều là lỗi).
- 🔗 **Alias** — `"primary": "$blue500"` sinh ra `var(--sg-color-blue-500)`; không lặp lại giá trị hex.
- 🌗 **Theme nhiều trục** — `themeAxes` sinh ra `html[data-theme="dark"]`, `html[data-palette="forest"]`, … và có thể bật tắt độc lập.
- ⚡ **Một lệnh gọi, một file** — `generate(theme)` trả về CSS để bạn `@import` cạnh `@import "tailwindcss"`; không cần `@plugin`, không cần file safelist.
- 🚀 **Spacing bằng biến CSS** — các utility `.sp-*` với chuỗi giá trị dự phòng `var()` thay cho hàng nghìn class trong safelist.
- 🧩 **Design token có kiểu + helper CVA** — `createVariantMapper` ánh xạ key của token sang tên class (gồm cả class trạng thái `hover:`/`active:`).
- 🖥️ **CLI + plugin** — `style-gen` (`init`, `generate`, `schema`, `tokens`, `doctor`, `budget`), `styleGenVite`, `styleGenNext`.

---

## Cài đặt

Package này được phát hành trên **GitHub Packages**. Để cài đặt, hãy xác thực bằng một
GitHub Personal Access Token (classic) có scope `read:packages`.

**1. Cấu hình scope `@duydpdev`** — dùng file mà trình quản lý package của bạn đọc. Yarn Berry (v2 trở lên) đọc `.yarnrc.yml` và bỏ qua `.npmrc`.

Yarn Berry — thêm vào `.yarnrc.yml` của dự án:

```yaml
npmScopes:
  duydpdev:
    npmRegistryServer: "https://npm.pkg.github.com"
    npmAlwaysAuth: true
    npmAuthToken: "${GITHUB_PAT}"
```

npm, pnpm và Yarn Classic — thêm vào `.npmrc` của dự án:

```ini
@duydpdev:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PAT}
```

Đặt `GITHUB_PAT` trong môi trường của bạn (đừng commit token):

```bash
export GITHUB_PAT=ghp_xxxxxxxxxxxxxxxxxxxx
```

**2. Cài đặt:**

```bash
yarn add @duydpdev/style-generator
```

> Quyền truy cập được cấp theo từng collaborator. Nếu lúc cài đặt nhận `404`/`401`, token của bạn
> thiếu `read:packages` hoặc bạn chưa được thêm vào repository.

Các peer dependency và các phiên bản mà CI kiểm thử: [reference/core.md](./reference/core.md#các-peer-dependency).

---

## Bắt đầu nhanh

Bắt đầu từ một ứng dụng đã build được với Tailwind CSS v4, sau đó:

```bash
yarn style-gen init
```

> **Cảnh báo:** Hãy cài package trước và luôn chạy CLI qua trình quản lý package của bạn (`yarn style-gen …`). Không bao giờ chạy nó qua `npx`: tên `style-gen` chưa có chủ trên registry npm công khai, nên `npx` có thể tải về một package không liên quan. Với npm, dùng `npm exec --no -- style-gen` để lệnh chỉ tìm bản cài trong dự án của bạn.

`init` ghi file theme JSON, file `theme.schema.json` của nó và `style-gen.config.json`, tìm `nuxt.config.*`, `next.config.*` hoặc `vite.config.*` ở thư mục gốc của dự án, rồi in ra đoạn mã cho file đó cùng các dòng CSS `@import`. Nó không bao giờ sửa config của bạn: hãy tự chép đoạn mã vào. Dưới đây là các đoạn mã nó in ra cho một dự án mới.

### Vite

Với thư mục `src/`, theme nằm ở `src/styles/theme.json`. Thêm plugin trước `tailwindcss()`; khi không có đối số, plugin đọc `style-gen.config.json`:

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  // No arguments: reads style-gen.config.json (theme, output, options).
  plugins: [styleGenVite(), tailwindcss()],
});
```

File CSS đầu vào mà `src/main.*` của bạn import, `src/index.css`:

```css
@import "tailwindcss";
@import "./styles/theme.css";
```

### Next.js

Theme nằm ở `styles/theme.json` (`src/styles/theme.json` nếu có thư mục `src/`). Tailwind chạy qua `@tailwindcss/postcss` (`postcss.config.mjs`), như trong `create-next-app --tailwind`. Hãy bọc config của bạn; `styleGenNext()` đọc `style-gen.config.json` và chạy được với cả webpack lẫn Turbopack:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {
  /* config options here */
};

// No arguments: reads style-gen.config.json (theme, output, options).
export default styleGenNext()(nextConfig);
```

`app/globals.css`, được `app/layout.tsx` import:

```css
@import "tailwindcss";
@import "../styles/theme.css";
```

### Nuxt

Nuxt 4 đặt root của Vite là `app/`, nên theme nằm ở `app/assets/css/theme.json` và plugin nhận đường dẫn tuyệt đối. Khi truyền đường dẫn tường minh, plugin không đọc `style-gen.config.json` (file đó khi ấy chỉ phục vụ CLI): hãy đặt các tùy chọn của generator vào `options`.

```ts
// nuxt.config.ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineNuxtConfig({
  css: ["~/assets/css/main.css"],
  vite: {
    plugins: [
      // Absolute paths: Nuxt 4 sets Vite's root to app/.
      styleGenVite({
        themePath: fileURLToPath(
          new URL("./app/assets/css/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options: {}, // style-gen.config.json is NOT read when paths are passed; put generate() options here
      }),
      tailwindcss(),
    ],
  },
});
```

Tạo `app/assets/css/main.css` (`init` không tạo file này; `css` trong `nuxt.config.ts` sẽ nạp nó):

```css
@import "tailwindcss";
@import "./theme.css";
```

### Không dùng plugin bundler

Khi không có config bundler, `init` in ra cách dùng CLI. Theme nằm ở `styles/theme.json`:

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
```

Một file CSS trong `styles/`:

```css
@import "tailwindcss";
@import "./theme.css";
```

### Theme

Màu là một **object phẳng**; chỉ `colors` là bắt buộc:

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6366F1",
    "background": "#FFFFFF",
    "foreground": "#111827",
    "muted": "#6B7280"
  }
}
```

Chỉ vậy là xong phần nối dây — không có `@plugin` và không có file safelist. Bạn có sẵn `bg-primary`, `text-primary`, `border-primary`, các utility typography đặt theo tên kebab-case của key (`heading1` → `.heading-1`, `text16Medium` → `.text-16-medium`), `shadow-sm`, `rounded-md`, các utility spacing `.sp-*` và những thứ còn lại.

Cần các modifier độ mờ như `bg-primary/10`? Hãy liệt kê các mức trong `coverage.colors.opacities`, ví dụ `"coverage": { "colors": { "opacities": [10, 20] } }` trong `style-gen.config.json` (Nuxt: trong `options` của đoạn mã); xem [`documents/vi/reference/options.md`](./reference/options.md).

---

## Lệnh

Chạy từng lệnh dưới dạng `yarn style-gen <command>`; các flag có trong [`documents/vi/reference/cli.md`](./reference/cli.md).

| Lệnh       | Tác dụng                                                                                        |
| ---------- | ----------------------------------------------------------------------------------------------- |
| `init`     | Tạo sẵn theme, JSON Schema của nó và `style-gen.config.json`; in cách nối dây cho stack của bạn |
| `generate` | Kiểm tra hợp lệ theme và ghi `theme.css`                                                        |
| `doctor`   | Kiểm tra config, cặp theme × options, các tên utility trùng nhau và phần còn sót từ trước 5.0   |
| `schema`   | Ghi `theme.schema.json` để editor tự gợi ý                                                      |
| `tokens`   | Ghi một `theme.tokens.ts` chỉ chứa key, dùng cho bundle phía client                             |
| `budget`   | Báo lỗi khi kích thước gzip của CSS đã build vượt ngân sách                                     |

---

## Subpath

| Import       | Nội dung                                                                                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.`          | `generate`, `defineTheme`, `defineOptions`, `formatZodError` và hầu hết các export khác; kéo theo Zod                                                                      |
| `./tokens`   | `createDesignTokens`, `Breakpoint`, `COLOR_STATES`: các hằng token an toàn cho trình duyệt                                                                                 |
| `./cva`      | `createVariantMapper`, `toKebabCase`: key của token → tên class cho CVA                                                                                                    |
| `./spacing`  | `resolveSpacing`, `resolveSpacingProps`: prop spacing → class `.sp-*` và style                                                                                             |
| `./recipes`  | `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes` (không có trong `.`)                                                                            |
| `./types`    | Chỉ có kiểu: `ThemeConfig`, `StyleGeneratorOptions`, các kiểu variant                                                                                                      |
| `./vite`     | `styleGenVite`, plugin Vite (dùng cả cho Nuxt); chỉ chạy trên Node                                                                                                         |
| `./next`     | `styleGenNext`, hàm bọc config của Next.js; chỉ chạy trên Node                                                                                                             |
| `./ui`       | `recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle`, …: bộ component không có style; cần `class-variance-authority`, `clsx`, `tailwind-merge` (không có trong `.`) |
| `./ui-react` | Chỉ có kiểu: `Polymorphic` cho component React; cần `@types/react`                                                                                                         |

Import một subpath dưới dạng `@duydpdev/style-generator/<name>`; toàn bộ export theo subpath: [`documents/vi/reference/core.md`](./reference/core.md#toàn-bộ-export-theo-subpath).

---

## Tài liệu

| Trang                                                                                                                                            | Nội dung                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`documents/vi/getting-started/react-vite.md`](./getting-started/react-vite.md)                                                                  | Bắt đầu: React + Vite                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [`documents/vi/getting-started/next.md`](./getting-started/next.md)                                                                              | Bắt đầu: Next.js                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`documents/vi/getting-started/nuxt-vue.md`](./getting-started/nuxt-vue.md)                                                                      | Bắt đầu: Nuxt + Vue                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`documents/vi/components.md`](./components.md)                                                                                                  | Dùng và viết các component ví dụ                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| [`documents/vi/cookbook.md`](./cookbook.md)                                                                                                      | Các recipe cho từng việc nhỏ                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`documents/vi/guide.md`](./guide.md)                                                                                                            | Hướng dẫn từng bước                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [`documents/vi/reference/core.md`](./reference/core.md)                                                                                          | Barrel gốc: `generate`, `defineTheme`, `defineOptions`, toàn bộ export theo subpath, các peer dependency                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/vi/reference/theme.md`](./reference/theme.md)                                                                                        | Theme config: ngữ pháp của key, các nhóm token, alias, `themeAxes`, các biến `--sg-*`                                                                                                                                                                                                                                                                                                                                                                                       |
| [`documents/vi/reference/options.md`](./reference/options.md)                                                                                    | `StyleGeneratorOptions`, gồm cả `coverage`                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [`documents/vi/reference/cli.md`](./reference/cli.md)                                                                                            | Các lệnh `style-gen`, các flag và file cấu hình                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/vi/reference/vite.md`](./reference/vite.md)                                                                                          | `styleGenVite` (Nuxt cũng dùng)                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/vi/reference/next.md`](./reference/next.md)                                                                                          | `styleGenNext`                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [`documents/vi/reference/spacing.md`](./reference/spacing.md)                                                                                    | Các utility `.sp-*` và `resolveSpacingProps`                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`documents/vi/reference/tokens.md`](./reference/tokens.md)                                                                                      | `createDesignTokens` và các hằng token                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [`documents/vi/reference/cva.md`](./reference/cva.md)                                                                                            | `createVariantMapper`, `COLOR_STATES`, `toKebabCase`                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [`documents/vi/reference/types.md`](./reference/types.md)                                                                                        | Các kiểu được export                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [`documents/vi/reference/recipes.md`](./reference/recipes.md)                                                                                    | `createTailwindMergeExtension`, `splitSpacingProps`, `themeAxisAttributes`                                                                                                                                                                                                                                                                                                                                                                                                  |
| [`documents/vi/reference/ui.md`](./reference/ui.md)                                                                                              | `recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle` và các kiểu của bộ component                                                                                                                                                                                                                                                                                                                                                                                    |
| [`documents/vi/reference/ui-react.md`](./reference/ui-react.md)                                                                                  | `Polymorphic`                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [`documents/vi/migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)                                                                              | **4.x → 5.0.0** (thay đổi phá vỡ tương thích): `--sg-color-*`, `borderWidth` qua `@theme`, `spacing.properties` dạng mảng, các key `DesignTokens.Web` được đổi tên, token readonly/có kiểu theo options (`### Types`), giới hạn của typography, Node runner (emit ở `buildStart`, plugin không đối số, `resolveProjectPath`), mã thoát và flag chặt chẽ của CLI, các lệnh `tokens` và `budget`, `resetTailwindDefaults`, variant `base` được dành riêng, khai báo `.d.cts`. |
| [`documents/vi/migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md)                                                                              | **3.x → 4.0.0** (thay đổi phá vỡ tương thích): mọi API đã bị gỡ, các trường theme mới, thay đổi của CLI và quy trình rollback.                                                                                                                                                                                                                                                                                                                                              |
| [`documents/migration/4.0-to-4.1.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/4.0-to-4.1.md)                   | **4.0 → 4.1** (kiểm tra hợp lệ chặt chẽ hơn)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [`documents/migration/3.x-subpath-exports.md`](https://github.com/duydpdev/style-generator/blob/main/documents/migration/3.x-subpath-exports.md) | **Subpath export (3.x)**: tài liệu lịch sử; giải thích yêu cầu về `moduleResolution`.                                                                                                                                                                                                                                                                                                                                                                                       |
| [`documents/vi/architecture.md`](./architecture.md)                                                                                              | Cấu trúc mã nguồn, các export công khai theo subpath, các lệnh CLI                                                                                                                                                                                                                                                                                                                                                                                                          |
| [`documents/vi/testing.md`](./testing.md)                                                                                                        | Các lớp kiểm thử và pipeline CI                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [`documents/vi/deploy.md`](./deploy.md)                                                                                                          | Định dạng commit, branch và phát hành                                                                                                                                                                                                                                                                                                                                                                                                                                       |

Các phiên bản major cũ hơn: 2 → 3 gỡ bỏ các object màu lồng nhau và key `DEFAULT` (chỉ còn key camelCase phẳng, dùng `createVariantMapper` cho CVA); 1 → 2 làm phẳng các nhóm màu `base`/`text`/`common`.

---

## Ví dụ

Các ứng dụng chạy được cho Vite + React, Next.js và Nuxt nằm trong [`examples/`](https://github.com/duydpdev/style-generator/blob/main/examples/README.md); landing site trong `site/` dùng cùng các component đó.

## Đóng góp

Định dạng commit, branch và phát hành: [`documents/vi/deploy.md`](./deploy.md). Các lớp kiểm thử và pipeline CI: [`documents/vi/testing.md`](./testing.md).
