<!-- source: README.md sha256: 6b866be3b591 -->

# @duydpdev/style-generator

[English](../../README.md) · **Tiếng Việt**

Thư viện TypeScript + CLI biến một file theme JSON thành một **design system hoàn chỉnh cho Tailwind CSS v4**: một file CSS được sinh ra (biến theme, override dark mode/palette, utility cho typography và spacing, phần phủ class `@source inline`), design token có kiểu, và một JSON Schema để editor tự gợi ý.

Được phát hành trên npm registry công khai với tên `@duydpdev/style-generator`; cài đặt không cần token (xem [Cài đặt](#cài-đặt)).

> **Nâng cấp?** Đọc các hướng dẫn nâng cấp: [7.x → 8.0](./migration/7.x-to-8.0.md), [6.x → 7.0](./migration/6.x-to-7.0.md), [5.x → 6.0](./migration/5.x-to-6.0.md), [4.x → 5.0](./migration/4.x-to-5.0.md), [3.x → 4.0](./migration/3.x-to-4.0.md).

## Tính năng

- 🎨 **Theme config phẳng** — mọi màu nằm trong một namespace camelCase, được kiểm tra hợp lệ bằng một schema Zod chặt chẽ (key lạ và giá trị không an toàn đều là lỗi).
- 🔗 **Alias** — `"primary": "$blue500"` sinh ra `var(--sg-color-blue-500)`; không lặp lại giá trị hex.
- 🌗 **Theme nhiều trục** — `themeAxes` sinh ra `html[data-theme="dark"]`, `html[data-palette="forest"]`, … và có thể bật tắt độc lập.
- ⚡ **Một lệnh gọi, một file** — `generate(theme)` trả về CSS để bạn `@import` cạnh `@import "tailwindcss"`; không cần `@plugin`, không cần file safelist.
- 🚀 **Spacing bằng biến CSS** — các utility `.sp-*` với chuỗi giá trị dự phòng `var()` thay cho hàng nghìn class trong safelist.
- 🧩 **Design token có kiểu + helper CVA** — `createVariantMapper` ánh xạ key của token sang tên class (gồm cả class trạng thái `hover:`/`active:`).
- 🖥️ **CLI + plugin** — `style-gen` (`init`, `generate`, `schema`, `tokens`, `doctor`, `budget`, `canvas check`), `styleGenVite`, `styleGenNext`.

## Cài đặt

Package nằm trên npm registry công khai, nên không cần token và không cần cấu hình registry:

```bash
yarn add @duydpdev/style-generator
```

> **Trước đây đã cài từ GitHub Packages (7.1.1 trở về trước)?** Hãy xóa scope `@duydpdev` khỏi dự án, nếu không việc cài đặt vẫn resolve về GitHub Packages, nơi không còn nhận phiên bản mới:
> xóa khối `npmScopes.duydpdev` khỏi `.yarnrc.yml` (Yarn Berry) hoặc các dòng `@duydpdev:registry=https://npm.pkg.github.com` và `//npm.pkg.github.com/:_authToken=…` khỏi `.npmrc` (npm, pnpm, Yarn Classic), rồi chạy `yarn add @duydpdev/style-generator@latest`.
>
> **Vẫn còn một package `@duydpdev` khác lấy từ GitHub Packages (ví dụ `@duydpdev/logger`)?** Hãy giữ scope và cài package này từ URL tarball của npmjs.org: `"@duydpdev/style-generator": "https://registry.npmjs.org/@duydpdev/style-generator/-/style-generator-<version>.tgz"`. Một dependency dạng URL không có semver range, và mục `peerDependencies` trong package của bạn không thể là URL: hãy ghi phiên bản thuần ở đó (`syncpack` khi đó báo hai giá trị khác nhau).

Các peer dependency và các phiên bản mà CI kiểm thử: [reference/core.md](./reference/core.md#các-peer-dependency).

## Bắt đầu nhanh

Bắt đầu từ một ứng dụng đã build được với Tailwind CSS v4, sau đó:

```bash
yarn style-gen init
```

> **Cảnh báo:** Hãy cài package trước và luôn chạy CLI qua trình quản lý package của bạn (`yarn style-gen …`). Không bao giờ chạy nó qua `npx`: tên `style-gen` chưa có chủ trên registry npm công khai, nên `npx` có thể tải về một package không liên quan. Với npm, dùng `npm exec --no -- style-gen` để lệnh chỉ tìm bản cài trong dự án của bạn.

`init` ghi file theme JSON, file `theme.schema.json` của nó và `style-gen.config.json`, tìm `nuxt.config.*`, `next.config.*` hoặc `vite.config.*` ở thư mục gốc của dự án, rồi in ra đoạn mã cho file đó cùng các dòng CSS `@import`. Nó không bao giờ sửa config của bạn: hãy tự chép đoạn mã vào. Với một dự án Vite, nó in ra đoạn sau.

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
@source not "../.claude";
```

`@source not` ngăn Tailwind quét `.claude/rules/style-generator.md`, tức [hợp đồng cho agent](./agent-contract.md) mà `init` ghi cho các coding agent.

Next.js và Nuxt in ra đoạn mã riêng của chúng: xem [`style-gen init`](./reference/cli.md#style-gen-init), hoặc làm theo từng bước [Next.js](./getting-started/next.md) và [Nuxt + Vue](./getting-started/nuxt-vue.md).

### Không dùng plugin bundler

Khi không có config bundler, `init` in ra cách dùng CLI. Theme nằm ở `styles/theme.json`:

```bash
yarn style-gen generate            # writes styles/theme.css
yarn style-gen generate --watch    # regenerate on save
```

Import `./theme.css` cạnh `@import "tailwindcss";` trong một file CSS của `styles/`.

### Theme

Màu là một **object phẳng**; chỉ `colors` là bắt buộc. Các primitive đặt tên theo giá trị giữ giá trị literal, còn các key ngữ nghĩa đặt tên theo vai trò alias tới chúng bằng `$` ([quy ước đặt tên](./agent-contract.md#quy-ước-đặt-tên)):

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "white": "#FFFFFF",
    "gray500": "#6B7280",
    "gray900": "#111827",
    "blue600": "#2563EB",
    "background": "$white",
    "foreground": "$gray900",
    "muted": "$gray500",
    "primary": "$blue600",
    "onPrimary": "$white"
  }
}
```

Chỉ vậy là xong phần nối dây: không có `@plugin`, không có file safelist. Bạn có sẵn `bg-primary`, `text-primary`, `border-primary`, các utility typography đặt theo tên kebab-case của key (`text32Bold` → `.text-32-bold`), `shadow-sm`, `rounded-md`, các utility spacing `.sp-*` và những thứ còn lại. Các modifier độ mờ như `bg-primary/10` cần các mức trong `coverage.colors.opacities` ([`options`](./reference/options.md)).

## Được dùng trong

Hai ứng dụng đang chạy thư viện này ở phiên bản 8.1.1:

- Một ứng dụng có 24 thư mục component UI. CSS biên dịch là 12669 B gzip so với ngân sách 14000 B. Nâng cấp từ 7.2.0 mất 7 phút xử lý các vướng mắc.
- Ứng dụng còn lại có 20 component. CSS biên dịch là 13778 B gzip so với ngân sách 14925 B; `coverage.colors.prefixes` giữ nó trong ngân sách đó. Nâng cấp từ 4.0.3 mất 70 phút xử lý các vướng mắc.

Mọi vướng mắc và kết cục của từng cái: [Adopting 8.x in two real apps](https://github.com/duydpdev/style-generator/blob/main/documents/migration/adoption-8x.md).

## Tài liệu

- [Chỉ mục tài liệu](https://github.com/duydpdev/style-generator/blob/main/documents/README.md)
- [CLI](./reference/cli.md): `init`, `generate`, `doctor`, `schema`, `tokens`, `budget`, `canvas`, các flag và file cấu hình
- [Subpath](./reference/core.md#toàn-bộ-export-theo-subpath): entry point gốc chứa generator; token, CVA, spacing, recipe, plugin và bộ component nằm trong `./tokens`, `./cva`, `./spacing`, `./recipes`, `./vite`, `./next`, `./ui`, `./ui-react`, `./types`
- [Bắt đầu](./getting-started/react-vite.md): React + Vite, Next.js, Nuxt + Vue
- [Hướng dẫn](./guide.md), [khắc phục sự cố](./troubleshooting.md) và [cookbook](./cookbook.md)
- [Tham chiếu](./reference/core.md): một trang cho mỗi subpath, cùng `theme`, `options` và `cli`
- [Nhật ký thay đổi](https://github.com/duydpdev/style-generator/blob/main/CHANGELOG.md)
- [Các hướng dẫn nâng cấp](https://github.com/duydpdev/style-generator/blob/main/documents/README.md#migration)

## Dùng thử

- [Trang web](https://duydpdev.github.io/style-generator/): tài liệu đã được render
- [`llms.txt`](https://duydpdev.github.io/style-generator/llms.txt): toàn bộ tài liệu thành một chỉ mục cho các công cụ AI
- [Trang ví dụ](https://duydpdev.github.io/style-generator/examples/v4): ứng dụng harness đang chạy
- [Playground](https://duydpdev.github.io/style-generator/playground): dán theme JSON, nhận CSS và token có kiểu, tất cả chạy trong trình duyệt
- Bắt đầu một dự án: `npx degit duydpdev/style-generator/starters/vite-react my-app` (một ứng dụng Vite + React + Tailwind v4 nối qua `styleGenVite`)

## Ví dụ

Các ứng dụng chạy được cho React (`plain-react`, `harness`) và Nuxt (`plain-nuxt`) nằm trong [`examples/`](https://github.com/duydpdev/style-generator/blob/main/examples/README.md); landing site trong `site/` dùng cùng các component đó.

## Đóng góp

Định dạng commit, branch và phát hành: [`documents/vi/deploy.md`](./deploy.md). Các lớp kiểm thử và pipeline CI: [`documents/vi/testing.md`](./testing.md).
