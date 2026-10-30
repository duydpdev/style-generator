# User Guide

Hướng dẫn tích hợp `@duydpdev/style-generator` 5.0 vào dự án **Tailwind CSS v4**. Tra cứu đầy đủ (option, export, CLI) nằm ở [`README.md`](../README.md); đang nâng cấp từ 4.x thì đọc [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md), từ 3.x thì đọc [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

## Mục lục

1. [Cài đặt](#cài-đặt)
2. [Tạo Theme Config](#tạo-theme-config)
3. [Sinh CSS và import vào Tailwind](#sinh-css-và-import-vào-tailwind)
4. [Multi-axis theming](#multi-axis-theming)
5. [Spacing Helpers](#spacing-helpers)
6. [Build components](#build-components)
7. [TypeScript Tips](#typescript-tips)
8. [Nâng cấp từ bản cũ](#nâng-cấp-từ-bản-cũ)

---

## Cài đặt

Package được publish lên GitHub Packages. Cấu hình scope `@duydpdev` trong file mà package manager của bạn đọc (Yarn Berry đọc `.yarnrc.yml` và bỏ qua `.npmrc`); cách tạo PAT `read:packages` nằm ở mục Installation của [`README.md`](../README.md#1-installation).

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

**Peer dependencies:** `tailwindcss ^4.1.0` (Tailwind v3 không còn được hỗ trợ); `typescript ^5 || ^6` (tuỳ chọn, để type-check theo `.d.ts` của package) và `vite ^5 || ^6 || ^7 || ^8` (tuỳ chọn, chỉ khi dùng `styleGenVite`). Bản đã được CI kiểm: bảng peer trong [`README.md`](../README.md). `zod` là dependency thường của package — không cần cài riêng.

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

Khai báo key anh em cạnh màu gốc: `primary`, `primaryHover`, `primaryActive`. Registry tự sinh `hover:bg-primary-hover`, `active:bg-primary-active` (và dạng `text-`/`border-`), còn `createVariantMapper(..., { states: COLOR_STATES })` gộp chúng thành một chuỗi class (xem [Build components](#build-components)). Tên state được kebab-case (`focusVisible` → `focus-visible:`).

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
import { options } from "./style-gen.options"; // một nguồn options dùng chung, xem "Build components"

export default defineConfig({
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // phải khớp đường dẫn @import trong CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

Plugin ghi `theme.css` (nguyên tử, chỉ khi nội dung đổi) ở hook `buildStart`, tức khi dev server khởi động và khi bắt đầu build; theme được đăng ký với Rollup (`this.addWatchFile`) nên `vite build --watch` cũng build lại khi theme đổi. Trong dev, mỗi lần lưu theme JSON plugin ghi lại (debounce) và chỉ full-reload trình duyệt khi CSS thật sự đổi. Lỗi ở `buildStart` làm hỏng build với thông báo theo từng bước (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` có thể là đường dẫn tuyệt đối hoặc nằm ngoài root (theme dùng chung trong monorepo); `outDir` phải nằm trong root. Thêm `theme.css` vào `.gitignore` nếu theme JSON là nguồn sự thật.

Hai lưu ý về dev server:

- **Vite 5 cần `listen()`.** `buildStart` của dev server chỉ chạy khi `server.listen()` (hoặc `middlewareMode`) được gọi; `createServer()` rồi `ssrLoadModule` mà không `listen()` thì trên Vite 5 `theme.css` chưa được ghi. Plugin đặt `perEnvironmentStartEndDuringDev`, nên từ Vite 6 trở lên `buildStart` cũng chạy trong trường hợp đó.
- **Plugin chỉ đọc config một lần**, lúc Vite nạp config. Sửa `style-gen.config.json` (dạng không tham số) khi dev server đang chạy thì chưa có hiệu lực: khởi động lại dev server. Chỉ file theme JSON được theo dõi.

Nuxt chạy trên Vite nên đăng ký cùng plugin trong `nuxt.config.ts → vite.plugins`. Nuxt 4 đặt `root` của Vite là `app/` (`srcDir`), nên đường dẫn tương đối sẽ được tính từ `app/`; dùng đường dẫn tuyệt đối:

```typescript
// nuxt.config.ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options";

export default defineNuxtConfig({
  css: ["~/assets/css/globals.css"],
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(new URL("./theme.json", import.meta.url)),
        outDir: fileURLToPath(new URL("./app/assets/css", import.meta.url)),
        options,
      }),
      tailwindcss(),
    ],
  },
});
```

Ví dụ hoàn chỉnh: `examples/react-v4` (Vite + React), `examples/nuxt-v4` (Nuxt 4) và `examples/next-v4` (Next 16) dùng chung theme và options từ `examples/design-system`; xem [`examples/design-system/README.md`](../examples/design-system/README.md).

**Không truyền tham số:** `styleGenVite()` đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) ở root của Vite — `theme`, `output` (file CSS cần ghi) và mọi option của `generate()` — nên CLI và bundler dùng chung một nguồn cấu hình. Config hỏng hoặc sai schema ném `[style-gen-vite] Invalid config (<file>):` kèm từng dòng lỗi, không bao giờ im lặng rơi về mặc định. Khi có tham số thì file config không được đọc. File config được đọc **một lần** khi nạp config của bundler (xem ở trên).

### Cách 2: Next.js

```typescript
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";
import { options } from "./style-gen.options";

const nextConfig: NextConfig = {};

export default styleGenNext({
  themePath: "app/theme/theme.json",
  outDir: "app/theme",
  options,
})(nextConfig);
```

Chạy được với webpack lẫn Turbopack, không import `next` nên không thêm peer dependency. Chỉ ghi `theme.css` khi Next nạp config ở `phase-development-server` (`next dev`, kèm watcher) hoặc `phase-production-build` (`next build`); các phase khác (`next start`, export, …) trả config mà không đọc theme. `nextConfig` có thể là object hoặc dạng hàm `(phase, { defaultConfig }) => config` (được gọi với đúng tham số của Next). `styleGenNext()` không tham số đọc `style-gen.config.json` ở `process.cwd()` như Vite, và cũng chỉ **một lần** khi Next nạp config (sửa file config thì khởi động lại `next dev`). Watcher của `next dev` không chết khi theme tạm thời sai (lỗi được log, `theme.css` cũ giữ nguyên) và được thay khi config nạp lại với theme/output khác. `themePath` có thể tuyệt đối hoặc ngoài project, `outDir` phải ở trong project; dấu `/` đầu không còn bị đổi thành đường dẫn tương đối. Giới hạn: guard đường dẫn không `realpath` symlink. Khi theme và options nằm trong một package workspace (như `examples/design-system`), thêm package đó vào `transpilePackages` của Next. Xem `examples/next-v4`.

### Cách 3: CLI

```bash
yarn style-gen init                 # scaffold theme + theme.schema.json + script generate() + style-gen.config.json
yarn style-gen generate             # ghi styles/theme.css
yarn style-gen generate --watch     # sinh lại khi lưu theme hoặc style-gen.config.json
yarn style-gen doctor               # kiểm tra cấu hình, schema, theme × options; cảnh báo va chạm utility, gợi ý $alias và biến --sg-<màu> kiểu 4.x còn sót (quét file nguồn dưới thư mục hiện tại)
yarn style-gen schema               # ghi theme.schema.json cạnh theme
yarn style-gen tokens               # ghi theme.tokens.ts: chỉ các key của DesignTokens.Web, cho bundle client
yarn style-gen budget .next/static/css --max-gzip 14925   # CI: fail khi CSS build vượt ngân sách gzip
```

Không chạy CLI qua `npx`: tên `style-gen` chưa có ai giữ trên npm public nên `npx` có thể tải nhầm package lạ. Dùng npm thì chạy `npm exec --no -- style-gen`.

`style-gen --help` liệt kê lệnh, `style-gen <lệnh> --help` in flag của riêng lệnh đó. Flag được parse **chặt**: flag lạ (`--them`) là lỗi chứ không còn bị bỏ qua. Mã thoát: `0` thành công / `--help` / `--version` / huỷ prompt, `1` lỗi (`budget` dùng `2` cho lỗi cú pháp, xem dưới).

Flag `generate`: `--theme <path>`, `--out <path>`, `-w`/`--watch`. Thứ tự resolve cấu hình, theo từng key: flags → file config → mặc định (`styles/theme.json` → `styles/theme.css`). File config là một trong hai nguồn, chọn theo kiểu _hoặc_: `style-gen.config.json` nếu nó tồn tại, nếu không thì `package.json["style-gen"]`; hai nguồn không bao giờ được merge (`style-gen.config.json` hỏng thì bị báo lỗi chứ không rơi sang `package.json`). File config được validate bằng cùng schema với option của `generate()`: gõ sai key (`breakpoint` thay vì `breakpoints`) hay giá trị không hợp lệ thì `generate` in `Invalid config (<file>):` kèm từng dòng `path → message`, không ghi file và thoát với mã 1; `doctor` báo `Config (<file>) ❌ Invalid`, dừng ở đó (các bước sau sẽ chạy trên mặc định sai) và thoát với mã 1. File config không parse được JSON (hỏng) thì `generate` cảnh báo rồi dùng mặc định. `--theme` được phép trỏ ra ngoài project; `--out` và `output` phải nằm trong project.

`--watch` theo dõi cả theme **lẫn file config** và đọc lại config mỗi lần đổi, nên `output`, `breakpoints`, `resetTailwindDefaults`… đổi có hiệu lực không cần khởi động lại. Sửa config thành sai chỉ bị báo lỗi và **config hợp lệ gần nhất vẫn được giữ** cho tới khi bạn sửa xong. Theme không đọc được lúc khởi động (thiếu file, là thư mục) hoặc config sai lúc khởi động thoát mã 1 trước khi tạo watcher; sau khi đã watch, lỗi theme/ghi file chỉ được log.

`tokens` ghi `theme.tokens.ts` (`export const tokens = {…} as const`) chỉ chứa **key** của `DesignTokens.Web` (mỗi category một mảng key camelCase, cộng `breakpoints`, `screens`, `spacingProperties`), để bundle client không phải kèm runtime `./tokens` và theme JSON (khoảng 2,4 kB gzip so với khoảng 0,6 kB). Mặc định ghi cạnh theme và phải nằm trong project (theme ngoài project cần `--out`); chạy lại khi key của theme đổi.

`budget <file.css|dir> --max-gzip <bytes>` cộng gzip của mọi file `.css` (đệ quy nếu là thư mục) và in `OK: …` hoặc `OVER BUDGET: …`. Mã thoát `0` trong ngân sách, `1` vượt, `2` sai cú pháp / không đọc được / không có CSS. Lệnh này thay cho script `check-css-budget.mjs` mà consumer từng phải chép.

Script do `init` sinh và `style-gen generate` ghi cùng một file (`output` trong config); chạy một trong hai (`node plugins/theme-plugin.ts` cần Node >= 22.18). `doctor` chỉ kiểm tra script khi config có `plugin` — setup `styleGenVite`/`styleGenNext` hay chỉ dùng CLI không cần. `doctor` còn kiểm tra cặp theme × options (`❌ Invalid theme/options`), coi `output`/`plugin` thoát khỏi root là lỗi, và in gợi ý `$alias` khi một override trong `themeAxes` lặp lại giá trị literal của một key khác ở base.

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

### Xoá namespace mặc định của Tailwind (`resetTailwindDefaults`)

Mặc định Tailwind vẫn giữ thang màu, `rounded-*` và `shadow-*` của nó bên cạnh token của bạn. `resetTailwindDefaults` xoá từng namespace để chỉ còn token của theme:

```typescript
generate(theme, { resetTailwindDefaults: ["colors", "radius", "shadow"] });
```

Mỗi tên thêm một dòng `--color-*: initial;`, `--radius-*: initial;` hoặc `--shadow-*: initial;` ở **đầu** khối `@theme inline`. `"colors"` cũng xoá `--color-white`/`--color-black` (tự khai báo trong `colors` nếu còn dùng). Utility tĩnh như `rounded-full`, `rounded-none`, `shadow-none` và các họ `inset-`/`drop-`/`text-shadow` không bị đụng tới. Mỗi tên đòi một thay thế không rỗng trong theme: `"colors"` đòi `colors` (không rỗng; schema vẫn nhận `colors: {}`), `"radius"` đòi `borderRadius`, `"shadow"` đòi `shadows` (ngược lại `generate()` ném lỗi tại `resetTailwindDefaults.<i>`, vì xoá mặc định mà không có thay thế làm `bg-red-500`/`rounded-md`/`shadow-md` biên dịch ra rỗng); `doctor` cũng báo lỗi này. Trùng tên hay đổi thứ tự không đổi output. Cũng dùng được trong `style-gen.config.json`.

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
- **Override ghép giữa các trục** (`[data-theme="dark"][data-palette="forest"]`) và biến ngoài `--sg-*` vẫn là CSS viết tay; bảng phạm vi ở [`examples/design-system/README.md`](../examples/design-system/README.md).

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
- **Variant tên `base` bị dành riêng:** `"base"` nghĩa là "không override" (`ThemeAxesState`, `themeAxisAttributes`), nên `ThemeSchema` từ chối `themeAxes.<trục>.base`. Đặt tên khác (`default`, `standard`). Trục tên `base` vẫn hợp lệ.
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

## Build components

Mục này đi từ theme tới component, theo đúng thứ tự các file trong `examples/design-system` (package workspace dùng chung cho ba app mẫu `react-v4`, `next-v4`, `nuxt-v4`; chi tiết ở [`examples/design-system/README.md`](../examples/design-system/README.md)). Mỗi bước chỉ import từ subpath an toàn cho browser (`./tokens`, `./cva`, `./recipes`, `./types`), không kéo Zod hay Node vào bundle client.

```text
src/theme.json         → theme (nguồn sự thật)
src/style-gen.options.ts → options dùng chung (bundler, tokens, recipe)
src/tokens.ts          → createDesignTokens(theme, options)
src/recipes/*.ts       → recipe headless (cva + createVariantMapper)
src/cn.ts              → clsx + tailwind-merge biết token của theme
src/axes.ts            → themeAxisAttributes<Theme>
```

### 1. Theme

Một file JSON như ở [Tạo Theme Config](#tạo-theme-config). Import nó như module (`resolveJsonModule`) để giữ kiểu literal của từng key:

```typescript
import themeJson from "./theme.json";

export type Theme = typeof themeJson; // đầu vào của ColorVariant<Theme>, ThemeAxesState<Theme>, …
export const theme = themeJson;
```

### 2. Options dùng chung: `style-gen.options.ts`

Mọi nơi gọi `generate()` (Vite plugin, Next plugin, `createDesignTokens`, kiểu của recipe) phải thấy **cùng một** options, nếu không `@source inline` và token sẽ lệch nhau. Đặt chúng trong một module không phụ thuộc gì:

```typescript
// src/style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Dùng `as const satisfies` với `import type`, không dùng `defineOptions()`: `defineOptions` chỉ có ở root `.` (kéo Zod vào bundle browser), còn file này vừa được cấu hình bundler nạp bằng Node (type stripping) vừa chạy ở browser. Tuple `breakpoints` literal là thứ thu hẹp `BreakpointKeys<typeof options>` thành `"md" | "lg"`. Nếu dự án cũng dùng CLI (`style-gen generate`), `style-gen.config.json` phải lặp lại các giá trị này; ví dụ có một test để hai bản không lệch nhau.

### 3. Tokens

`generate()` trả `tokens`; để dùng ở client, dựng riêng, an toàn cho browser, bằng `createDesignTokens` từ `./tokens`:

```typescript
// src/tokens.ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";

import { options } from "./style-gen.options";
import themeJson from "./theme.json";

export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;
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

### 4. Recipe: `createVariantMapper` + `COLOR_STATES`

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

Một recipe headless ghép các mapper bằng `cva`; component của framework (React, Vue) chỉ bọc nó. Mỏ neo DX là `satisfies` trên danh sách intent: đổi tên hoặc xoá một màu trong `theme.json` thì compiler báo lỗi đúng dòng đó, thay vì phát ra class không còn tồn tại.

```typescript
// src/recipes/button.ts (rút gọn)
import { cva } from "class-variance-authority";
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

export const intents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<Theme>[];

const bg = createVariantMapper("bg", tokens.colors, { states: COLOR_STATES });

export const buttonRecipe = cva("inline-flex items-center", {
  variants: { color: bg },
});
```

Tám recipe của ví dụ (`button`, `input`, `card`, `badge`, `stack`, `dialog`, `text`, `box`) đều theo mẫu này. Class có độ mờ (`bg-primary/10`) không thuộc phạm vi `@source inline` của registry, nên viết nguyên văn trong file nguồn để scanner của Tailwind tìm thấy.

### 5. `cn`: gộp class biết token của theme

`tailwind-merge` mặc định không biết `text-16-medium`, `shadow-md` hay `rounded-pill` của theme bạn nên có thể giữ nhầm class. `createTailwindMergeExtension` (từ `./recipes`) đăng ký chúng vào đúng nhóm class; `tailwind-merge` vẫn là dependency của ứng dụng:

```typescript
// src/cn.ts
import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";
import { createTailwindMergeExtension } from "@duydpdev/style-generator/recipes";

import { tokens } from "./tokens";

const twMerge = extendTailwindMerge(createTailwindMergeExtension(tokens));

export const cn = (...inputs: ClassValue[]): string => twMerge(clsx(inputs));
```

`cn("text-16-medium", "text-32-bold")` giữ lại class sau, và `cn("rounded-md", "rounded-pill")` cũng vậy. Component gọi `cn(buttonRecipe({ … }), className)`.

### 6. Bật trục theme trên DOM: `themeAxisAttributes`

`themeAxisAttributes<Theme>(state, attributes?)` trả các attribute `data-*` của các trục đang bật, có kiểu theo `theme.json`; `"base"` hoặc trục bị bỏ qua không phát gì. Mặc định attribute là `data-<trục>`; khi `options.axes.attribute` đổi tên attribute, truyền cùng bản đồ đó làm đối số thứ hai để DOM và selector CSS không lệch nhau:

```typescript
// src/axes.ts
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import type { ThemeAxesState } from "@duydpdev/style-generator/types";

import type { Theme } from "./tokens";

export const axisAttributes = (state: ThemeAxesState<Theme>) =>
  themeAxisAttributes<Theme>(state);

axisAttributes({ theme: "highContrast", palette: "forest" });
// { "data-theme": "high-contrast", "data-palette": "forest" }
```

Rải kết quả lên `<html>` (React: `<html {...axisAttributes(state)}>`; Nuxt: `useHead({ htmlAttrs: axisAttributes(state) })`). Nếu `options.axes.attribute` đổi tên attribute, truyền cùng bản đồ đó vào tham số thứ hai (`{ attribute }`).

### 7. Spacing prop: `splitSpacingProps`

Component nhận spacing prop (`p`, `px`, `gap`, …, số hoặc `{ base, md, lg }`) tách chúng khỏi phần còn lại bằng `splitSpacingProps` từ `./recipes`; kiểu `SpacingProps<BreakpointKeys<typeof options>>` lấy key breakpoint từ options, nên `{ xl: 4 }` là lỗi kiểu khi `xl` không nằm trong `breakpoints`:

```typescript
import { splitSpacingProps } from "@duydpdev/style-generator/recipes";

const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
// với props = { p: 4, mx: { base: 2, md: 4 }, id: "x" }:
// spacing.className → "sp-p sp-mx"
// spacing.style     → { "--sg-sp-p": "1rem", "--sg-sp-mx": "0.5rem", "--sg-sp-mx-md": "1rem" }
// rest → các prop còn lại (className, children, …)
```

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

- **4.x → 5.0.0** (breaking: `--sg-color-*`, `borderWidth` qua `@theme`, `spacing.properties` dạng mảng, key `DesignTokens.Web` đổi tên, typography chặt hơn, Node runner: emit ở `buildStart`, plugin không tham số, `resolveProjectPath`, mã thoát + flag chặt của CLI, lệnh `tokens`/`budget`, `resetTailwindDefaults`, variant `base` dành riêng, khai báo `.d.cts`): [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md).
- **3.x → 4.0.0** (breaking: chỉ Tailwind v4, `generate()` thay plugin + safelist, schema strict, `themeAxes`, `borderWidth`, `--sg-sp-*`): [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md), gồm bảng trước/sau và runbook rollback.
- Đợt subpath exports của 3.x (lịch sử, còn yêu cầu về `moduleResolution`): [`migration/3.x-subpath-exports.md`](./migration/3.x-subpath-exports.md).
- Key `themes` một trục đã đổi tên thành `themeAxes`; theme còn dùng tên cũ bị từ chối kèm thông báo hướng dẫn đổi tên (nguyên văn trong guide migration).
- Các major cũ hơn: 2 → 3 bỏ object màu lồng nhau và key `DEFAULT` (chỉ còn key flat camelCase); 1 → 2 làm phẳng các nhóm màu `base`/`text`/`common`.
