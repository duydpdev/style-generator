<!-- source: documents/guide.md sha256: c858dee31ae6 -->

# Hướng dẫn sử dụng

Cách tích hợp `@duydpdev/style-generator` 5.0 vào một dự án **Tailwind CSS v4**. Tài liệu tham chiếu đầy đủ (tùy chọn, export, CLI) nằm trong [`README.md`](./README.md); nếu bạn đang nâng cấp từ 4.x, hãy đọc [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md), còn từ 3.x thì đọc [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md).

## Mục lục

1. [Cài đặt](#cài-đặt)
2. [Tạo theme config](#tạo-theme-config)
3. [Sinh CSS và import vào Tailwind](#sinh-css-và-import-vào-tailwind)
4. [Theme nhiều trục](#theme-nhiều-trục)
5. [Spacing helper](#spacing-helper)
6. [Xây dựng component](#xây-dựng-component)
7. [Mẹo TypeScript](#mẹo-typescript)
8. [Nâng cấp từ phiên bản cũ](#nâng-cấp-từ-phiên-bản-cũ)

---

## Cài đặt

Package được phát hành lên GitHub Packages. Hãy cấu hình scope `@duydpdev` trong file mà trình quản lý package của bạn đọc (Yarn Berry đọc `.yarnrc.yml` và bỏ qua `.npmrc`); cách tạo PAT `read:packages` nằm ở mục Cài đặt của [`README.md`](./README.md#cài-đặt).

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

Sau đó cài đặt:

```bash
yarn add @duydpdev/style-generator
```

**Các peer dependency:** `tailwindcss ^4.1.0` (Tailwind v3 không còn được hỗ trợ); `typescript ^5 || ^6` (tùy chọn, để kiểm tra kiểu với `.d.ts` của package) và `vite ^5 || ^6 || ^7 || ^8` (tùy chọn, chỉ khi bạn dùng `styleGenVite`). Các phiên bản mà CI kiểm chứng được liệt kê trong bảng peer ở [`README.md`](./README.md). `zod` là một dependency thông thường của package — không cần cài riêng.

```bash
yarn add tailwindcss typescript
```

---

## Tạo theme config

Tạo `styles/theme.json` chứa toàn bộ design token của bạn. Chỉ `colors` là bắt buộc; mọi trường khác đều tùy chọn. Theme được kiểm tra bằng một schema Zod **chặt chẽ**: key lạ, giá trị không an toàn và alias hỏng đều bị từ chối trước khi bất kỳ CSS nào được sinh ra.

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

| Trường          | Sinh ra                                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `colors`        | `bg-*`, `text-*`, `border-*` (bắt buộc)                                                                                              |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                          |
| `shadows`       | `shadow-*`                                                                                                                           |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                                    |
| `borderRadius`  | `rounded-*` (+ các variant `md:`/`lg:` cho những breakpoint được bật)                                                                |
| `fontFamily`    | `font-*` thông qua namespace `--font-*` của Tailwind                                                                                 |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` thông qua namespace `--border-width-*` của Tailwind (thay thế key `border` của 3.x) |
| `themeAxes`     | override theo từng trục (xem [Theme nhiều trục](#theme-nhiều-trục))                                                                  |

### Quy ước đặt key

Key của color dùng **camelCase** (hoặc kebab-case); thư viện chuyển chúng thành kebab-case cho biến CSS và class:

| Key của theme       | Biến CSS                     | Class Tailwind            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

- Ranh giới chữ cái→chữ số thêm một dấu gạch ngang (`blue500` → `blue-500`); key bắt đầu bằng chữ số được giữ nguyên (`2xl`). Hai key kebab-case thành cùng một tên (`blue500` và `blue-500`) sẽ bị từ chối.
- Key chỉ được chứa chữ cái, chữ số và `-`, và phải bắt đầu bằng chữ cái hoặc chữ số. **`_` bị từ chối ở mọi vị trí đặt tên** (token, tên trục, tên variant): hãy dùng `primaryActive` hoặc `primary-active`. Lý do: `toKebabCase` giữ lại `_` trong khi token camelCase bỏ nó đi, nên class do mapper sinh ra sẽ không tồn tại. CLI in lỗi dưới dạng `colors.primary_active → … camelCase … kebab-case …`.
- Giá trị không được chứa `;`, `{`, `}`, `<`, `@`, `\`, `/*` hoặc ký tự xuống dòng; dấu nháy phải cân bằng, và dấu ngoặc `(`/`[` nằm ngoài chuỗi có nháy cũng phải cân bằng (`rgb(0 0 0` bị từ chối tại đúng path của nó).
- Một key typography phải kebab-case thành tên `@utility` hợp lệ (không bắt đầu bằng chữ số hoặc dấu gạch ngang): `heading1` → `.heading-1`.
- Một key `fontFamily` không được trùng với tên font-weight của Tailwind (`thin`, `light`, `normal`, `medium`, `bold`, `black`, …).
- Mỗi nhóm token sở hữu namespace biến `--sg-<category>-` riêng (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …), nên key của hai nhóm khác nhau không bao giờ va chạm trên một biến (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`).
- Một key `typography` không được kebab-case thành `sp-*` hoặc `font-*` (nó sẽ che mất các utility spacing và font); `fontWeight` phải là một số từ 1 đến 1000 (số thập phân hợp lệ với variable font).
- Một key bắt đầu bằng một chuỗi gồm hai chữ cái viết hoa trở lên (`CTA`, `ABtn`, `HTMLParser`) bị từ chối kèm gợi ý đổi tên (`cta`): class do token có kiểu tạo ra (`c-ta`) khác với class trong CSS (`cta`). Một chữ hoa đơn (`Blue`) hoặc một chuỗi chữ hoa ở giữa (`primaryCTA`) vẫn hợp lệ.
- Một key `borderWidth` không được kebab-case thành cùng tên với một key `colors` (cả hai sẽ sinh ra class `border-<key>`).
- Tổng hợp mọi quy tắc đặt tên, kèm ví dụ bị từ chối và hợp lệ: [Quy tắc đặt key](./reference/theme.md#quy-tắc-đặt-key).

### Alias `$key`

Một giá trị `"$<key>"` trỏ đến một key khác **trong cùng nhóm token** và được phát ra dưới dạng `var(--<cssVarPrefix>-<kebab-key>)`, nhờ đó bạn không phải lặp lại mã hex. Tiền tố thuộc về nhóm (`sg-color` cho `colors`, `sg-shadow` cho `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`), nên alias `"$base"` trong `shadows` trở thành `var(--sg-shadow-base)`, không phải `var(--sg-base)`:

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

Đích đến là **key gốc** (`$blue500`, không phải `$blue-500`); nó phải tồn tại và đồ thị alias không được chứa vòng lặp. Alias không được hỗ trợ trong `typography`.

### Trạng thái hover/active

Khai báo các key ngang hàng cạnh màu gốc: `primary`, `primaryHover`, `primaryActive`. Registry tự động sinh `hover:bg-primary-hover` và `active:bg-primary-active` (cùng các dạng `text-`/`border-`), và `createVariantMapper(..., { states: COLOR_STATES })` gộp chúng thành một chuỗi class duy nhất (xem [Xây dựng component](#xây-dựng-component)). Tên trạng thái được chuyển sang kebab-case (`focusVisible` → `focus-visible:`).

### Tự gợi ý trong editor

```bash
yarn style-gen schema        # writes theme.schema.json next to the theme file
```

Thêm `"$schema": "./theme.schema.json"` vào theme để editor gợi ý các key và cảnh báo về key lạ.

---

## Sinh CSS và import vào Tailwind

`generate(theme, options)` trả về `{ css, tokens, schema }`. `css` là **một file duy nhất** để `@import` cạnh Tailwind — không có `@plugin`, không có file safelist:

```css
@import "tailwindcss";
@import "./theme.css";
```

Chọn một cách để ghi `theme.css`:

### Cách 1: plugin Vite (khuyến nghị)

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options"; // one shared source of options, see "Build components"

export default defineConfig({
  plugins: [
    react(),
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

Plugin ghi `theme.css` (theo kiểu nguyên tử, chỉ khi nội dung thay đổi) trong hook `buildStart`, tức là khi dev server khởi động và khi một lần build bắt đầu; theme được đăng ký với Rollup (`this.addWatchFile`), nên `vite build --watch` cũng build lại khi theme thay đổi. Trong dev, mỗi lần bạn lưu theme JSON, plugin ghi lại file (có debounce) và chỉ tải lại toàn trang trình duyệt khi CSS thực sự thay đổi. Một lỗi trong `buildStart` làm build thất bại với thông báo theo từng giai đoạn (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` có thể là đường dẫn tuyệt đối hoặc nằm ngoài root (một theme dùng chung trong monorepo); `outDir` phải nằm trong root. Hãy thêm `theme.css` vào `.gitignore` nếu theme JSON là nguồn sự thật.

Hai lưu ý về dev server:

- **Vite 5 cần `listen()`.** `buildStart` của dev server chỉ chạy khi `server.listen()` (hoặc `middlewareMode`) được gọi; với `createServer()` rồi `ssrLoadModule` mà không có `listen()`, `theme.css` chưa được ghi trên Vite 5. Plugin đặt `perEnvironmentStartEndDuringDev`, nên từ Vite 6 trở đi `buildStart` cũng chạy trong trường hợp đó.
- **Plugin chỉ đọc config một lần**, khi Vite nạp config của nó. Sửa `style-gen.config.json` (dạng không đối số) trong lúc dev server đang chạy thì chưa có tác dụng: hãy khởi động lại dev server. Chỉ file theme JSON được theo dõi.

Nuxt chạy trên Vite, nên hãy đăng ký cùng plugin đó trong `nuxt.config.ts → vite.plugins`. Nuxt 4 đặt `root` của Vite là `app/` (`srcDir`), nên đường dẫn tương đối được phân giải từ `app/`; hãy dùng đường dẫn tuyệt đối:

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

Ví dụ hoàn chỉnh: `examples/react-v4` (Vite + React) dùng theme và các tùy chọn từ `examples/design-system`; xem [`examples/design-system/README.md`](../../examples/design-system/README.md). Các ứng dụng plain `examples/plain-react` và `examples/plain-nuxt` mỗi ứng dụng sở hữu theme riêng; xem [Component](./components.md#ví-dụ-plain-chép-dùng).

**Không đối số:** `styleGenVite()` đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) tại root của Vite — `theme`, `output` (file CSS cần ghi) và mọi tùy chọn của `generate()` — nhờ đó CLI và bundler dùng chung một nguồn cấu hình duy nhất. Một config bị hỏng hoặc không qua được schema sẽ ném `[style-gen-vite] Invalid config (<file>):` kèm từng dòng lỗi, và không bao giờ âm thầm quay về giá trị mặc định. Khi truyền đối số, file config không được đọc. File config chỉ được đọc **một lần**, khi bundler nạp config của nó (xem ở trên).

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

Chạy được với cả webpack lẫn Turbopack, và không import `next`, nên không thêm peer dependency nào. Nó chỉ ghi `theme.css` khi Next nạp config ở `phase-development-server` (`next dev`, kèm watcher) hoặc `phase-production-build` (`next build`); các phase khác (`next start`, export, …) trả về config mà không đọc theme. `nextConfig` có thể là một object hoặc một hàm `(phase, { defaultConfig }) => config` (được gọi với các đối số của chính Next). `styleGenNext()` không đối số đọc `style-gen.config.json` từ `process.cwd()` giống như Vite, và cũng chỉ **một lần** khi Next nạp config (sau khi sửa file config, hãy khởi động lại `next dev`). Watcher của `next dev` không chết khi theme tạm thời không hợp lệ (lỗi được ghi log và `theme.css` cũ được giữ lại) và được thay thế khi config nạp lại với theme/output khác. `themePath` có thể là đường dẫn tuyệt đối hoặc nằm ngoài dự án, trong khi `outDir` phải nằm trong dự án; một dấu `/` ở đầu không còn bị viết lại thành đường dẫn tương đối. Hạn chế: bước kiểm tra đường dẫn không `realpath` các symlink. Khi theme và các tùy chọn nằm trong một workspace package (như `examples/design-system`), hãy thêm package đó vào `transpilePackages` của Next.

### Cách 3: CLI

```bash
yarn style-gen init                 # scaffold theme + theme.schema.json + style-gen.config.json, print the bundler snippet for your stack
yarn style-gen generate             # writes styles/theme.css
yarn style-gen generate --watch     # regenerates when theme or style-gen.config.json is saved
yarn style-gen doctor               # checks config, schema, theme × options; warns about utility collisions, suggests $alias and flags leftover 4.x-style --sg-<color> variables (scans source files under the current directory)
yarn style-gen schema               # writes theme.schema.json next to the theme
yarn style-gen tokens               # writes theme.tokens.ts: only the DesignTokens.Web keys, for client bundles
yarn style-gen budget .next/static/css --max-gzip 14925   # CI: fail when built CSS exceeds the gzip budget
```

Đừng chạy CLI qua `npx`: tên `style-gen` không thuộc về ai trên npm công khai, nên `npx` có thể tải về package của một người lạ. Với npm, hãy chạy `npm exec --no -- style-gen`.

`style-gen --help` liệt kê các lệnh, và `style-gen <command> --help` in ra các flag riêng của lệnh đó. Các flag được phân tích **chặt chẽ**: một flag lạ (`--them`) là lỗi chứ không bị bỏ qua. Mã thoát: `0` thành công / `--help` / `--version` / hủy ở bước nhắc, `1` lỗi (`budget` dùng `2` cho lỗi cú pháp, xem bên dưới).

Các flag của `generate`: `--theme <path>`, `--out <path>`, `-w`/`--watch`. Cấu hình được phân giải theo từng key theo thứ tự: flag → file config → giá trị mặc định (`styles/theme.json` → `styles/theme.css`). File config là một trong hai nguồn, chọn theo kiểu _hoặc cái này hoặc cái kia_: `style-gen.config.json` nếu nó tồn tại, nếu không thì `package.json["style-gen"]`; hai nguồn không bao giờ được merge (một `style-gen.config.json` hỏng được báo là lỗi thay vì rơi xuống `package.json`). File config được kiểm tra hợp lệ bằng cùng schema với các tùy chọn của `generate()`: một key gõ sai (`breakpoint` thay vì `breakpoints`) hoặc một giá trị không hợp lệ khiến `generate` in `Invalid config (<file>):` kèm từng dòng `path → message`, không ghi file nào và thoát với mã 1; `doctor` báo `Config (<file>) ❌ Invalid`, dừng tại đó (các bước sau sẽ chạy trên giá trị mặc định sai) và thoát với mã 1. Một file config không phải JSON parse được (bị hỏng) khiến `generate` cảnh báo rồi dùng các giá trị mặc định. `--theme` có thể trỏ ra ngoài dự án; `--out` và `output` phải nằm trong dự án.

`--watch` theo dõi cả theme **lẫn file config** và đọc lại config sau mỗi thay đổi, nên các thay đổi ở `output`, `breakpoints`, `resetTailwindDefaults`… có hiệu lực mà không cần khởi động lại. Sửa config sang trạng thái không hợp lệ chỉ báo lỗi và **config hợp lệ gần nhất được giữ lại** cho đến khi bạn sửa xong. Một theme không đọc được lúc khởi động (thiếu file, là một thư mục) hoặc một config không hợp lệ lúc khởi động sẽ thoát với mã 1 trước khi watcher được tạo; khi đã đang theo dõi, lỗi theme/ghi file chỉ được ghi log.

`tokens` ghi `theme.tokens.ts` (`export const tokens = {…} as const`) chỉ chứa các **key** của `DesignTokens.Web` (một mảng key camelCase cho mỗi nhóm token, cộng với `breakpoints`, `screens`, `spacingProperties`), nhờ đó client bundle không phải mang theo runtime `./tokens` và theme JSON (khoảng 2.4 kB gzip so với khoảng 0.6 kB). Theo mặc định nó được ghi cạnh theme và phải nằm trong dự án (một theme ngoài dự án cần `--out`); hãy chạy lại khi các key của theme thay đổi.

`budget <file.css|dir> --max-gzip <bytes>` cộng kích thước gzip của mọi file `.css` (đệ quy nếu truyền một thư mục) và in `OK: …` hoặc `OVER BUDGET: …`. Mã thoát `0` khi trong ngân sách, `1` khi vượt ngân sách, `2` cho lỗi cú pháp / đầu vào không đọc được / không có CSS. Lệnh này thay thế script `check-css-budget.mjs` mà các bên dùng trước đây phải tự chép.

`init` in ra cách nối dây cho stack mà nó phát hiện (`nuxt.config.*`, `next.config.*`, `vite.config.*`): đoạn mã `styleGenVite()`/`styleGenNext()` không đối số của Cách 1 và 2 (đường dẫn tuyệt đối cho Nuxt), hoặc `style-gen generate` khi không có config bundler; nó không bao giờ sửa config bundler. `doctor` kiểm tra cặp theme × tùy chọn (`❌ Invalid theme/options`), coi một `output` thoát ra ngoài root là lỗi, và in gợi ý `$alias` khi một override trong `themeAxes` lặp lại giá trị literal của một key khác trong base.

### Cách 4: script tùy chỉnh

```typescript
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";
import { Breakpoint } from "@duydpdev/style-generator/tokens";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checked AND validated at runtime
const options = defineOptions({
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
export { tokens };
```

### Class được tạo lúc runtime

Mọi color luôn có `bg-*`/`text-*`/`border-*` nhờ các dòng `@source inline` mà registry sinh ra. Những class bạn ghép bằng template literal thì Tailwind không quét được — hãy khai báo chúng bằng `extraSources`:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { extraSources: ["hover:bg-{primary,secondary}"] });
```

### Thu hẹp `@source inline` theo từng nhóm token (`coverage`)

Theo mặc định, mỗi nhóm token có một dòng `@source inline` bao phủ mọi key (colors: bảy tiền tố `bg-`/`text-`/`border-`/`ring-`/`outline-`/`divide-`/`placeholder-`). Một bảng màu lớn làm dòng đó rất dài; `coverage` thu hẹp nó theo từng nhóm token (`colors`, `typography`, `shadows`, `backDropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`):

| `coverage.<category>`        | Tác dụng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| :--------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| không khai báo, `true`, `{}` | Kết quả như trước, từng byte một.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `false`                      | Không phát ra dòng `@source inline` nào cho nhóm token đó, kể cả các dòng trạng thái (`hover:`, `active:`).                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `{ prefixes: [...] }`        | Chỉ giữ lại các tiền tố class được liệt kê (`bg`, `rounded-t`, …). Mỗi tiền tố phải thuộc về nhóm token đó, nếu không `generate()` sẽ ném lỗi; typography không có tiền tố (key chính là class).                                                                                                                                                                                                                                                                                                                                                                          |
| `{ keys: "aliased" }`        | Chỉ giữ lại các key có giá trị là alias `"$<key>"` (các key _giữ alias_) trong base hoặc trong bất kỳ override `themeAxes` nào; các primitive mà chúng trỏ đến không cần class. Dòng trạng thái đi theo: `hover:bg-x-hover` chỉ còn khi cả `x` và `xHover` đều còn. Không dùng được cho `typography` (nó không có alias).                                                                                                                                                                                                                                                 |
| `{ keys: "all" }`            | Mặc định: mọi key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `{ opacities: [10, 20] }`    | Chỉ dành cho `colors`. Thêm một dòng phụ, `{bg,text,border,ring,outline,divide,placeholder}-{<keys>}/{10,20}`, ngay sau dòng colors: cùng các tiền tố và key (nó đi theo `prefixes` và `keys`) với modifier độ mờ `/<n>` của Tailwind, nhờ đó `bg-primary/10` tồn tại ngay cả khi không có file nguồn nào nhắc đến nó. Các số nguyên phân biệt từ 1–100, không rỗng; được phát ra theo thứ tự tăng dần. Không kết hợp với các dòng trạng thái (`hover:bg-primary-hover/10` không được bao phủ). Bất kỳ nhóm token nào khác đều ném lỗi (`coverage.<category>.opacities`). |

`prefixes`, `keys` và `opacities` có thể kết hợp với nhau; các danh sách `prefixes` và `opacities` phải không rỗng. Với `keys: "aliased"`, nếu nhóm token không có key giữ alias nào (hoặc không khai báo key nào) thì không có gì được phát ra: giá trị mặc định không phải là alias. `coverage` chỉ thay đổi `@source inline`: `@theme inline`, `@utility` và `DesignTokens` có kiểu vẫn giữ nguyên (ngoại trừ `DesignTokens.Web.opacities`, liệt kê các mức `opacities`), nên một class vẫn còn dùng nhưng không còn được bao phủ thì phải xuất hiện nguyên văn trong mã nguồn hoặc được khai báo qua `extraSources`.

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    shadows: false,
  },
});
```

### Xóa các namespace mặc định của Tailwind (`resetTailwindDefaults`)

Theo mặc định, Tailwind giữ thang màu, `rounded-*` và `shadow-*` của riêng nó bên cạnh các token của bạn. `resetTailwindDefaults` xóa từng namespace để chỉ còn lại các token của theme:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { resetTailwindDefaults: ["colors", "radius", "shadow"] });
```

Mỗi tên thêm một dòng `--color-*: initial;`, `--radius-*: initial;` hoặc `--shadow-*: initial;` ở **đầu** khối `@theme inline`. `"colors"` cũng xóa `--color-white`/`--color-black` (hãy tự khai báo chúng trong `colors` nếu bạn vẫn dùng). Các utility tĩnh như `rounded-full`, `rounded-none`, `shadow-none` và các họ `inset-`/`drop-`/`text-shadow` không bị ảnh hưởng. Mỗi tên đòi hỏi một phần thay thế không rỗng trong theme: `"colors"` đòi `colors` (không rỗng; schema vẫn chấp nhận `colors: {}`), `"radius"` đòi `borderRadius`, `"shadow"` đòi `shadows` (nếu không `generate()` ném lỗi tại `resetTailwindDefaults.<i>`, vì xóa các giá trị mặc định mà không có phần thay thế khiến `bg-red-500`/`rounded-md`/`shadow-md` biên dịch ra không có gì); `doctor` cũng báo lỗi này. Tên trùng lặp hoặc thứ tự khác không làm thay đổi kết quả. Cũng dùng được trong `style-gen.config.json`.

### Class trùng với utility tích hợp sẵn của Tailwind

Một key có class trùng với một utility của Tailwind (`none` trong `colors`/`shadows`/`borderRadius`, một key typography trở thành `text-sm`, `h-1` (từ `h1`), `italic`…, các màu `transparent`/`current`/`inherit`, một màu có class `ring-`/`outline-`/`divide-` trùng một static của Tailwind như `solid` → `outline-solid`, `inset` → `ring-inset`, `xReverse` → `divide-x-reverse`, hoặc một độ rộng số nguyên như `3` → `ring-3`) không bị schema từ chối, nhưng quy tắc nào thắng do Tailwind quyết định. Hãy chọn một tên khác (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` liệt kê các xung đột mà nó nhận ra (chỉ cảnh báo). Một key `borderWidth` toàn chữ số (`2`) là ngoại lệ, không phải một xung đột mơ hồ: từ 5.0, giá trị của theme thay thế `border-2`, `border-x-2`, `divide-x-2` tích hợp sẵn của Tailwind (Tailwind tra theme trước thang mặc định); `doctor` vẫn cảnh báo để bạn xác nhận rằng đó là chủ ý.

---

## Theme nhiều trục

`themeAxes` ánh xạ một **tên trục** → các **variant** của nó; mỗi variant chỉ liệt kê các giá trị khác với base. Nhiều trục có thể cùng hoạt động một lúc:

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

CSS được sinh ra (sau `:root`, theo thứ tự khai báo):

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

Các quy tắc cần nhớ:

- **Selector được ghim vào `html`** (mặc định, `axes.scope: "root"`). Một thuộc tính đặt trên phần tử bao bọc khác sẽ không có tác dụng: một alias `var()` được tính tại phần tử _khai báo_ biến (`:root`), nên một override trên phần tử con không bao giờ chạm tới giá trị alias. Với một theme cục bộ, hãy đặt `axes.scope: "element"` (xem [Đổi thuộc tính và scope](#đổi-thuộc-tính-và-scope-axes)).
- **Giá trị thuộc tính là dạng kebab của key**: variant `highContrast` → `data-palette="high-contrast"`; trục `colorScheme` → `data-color-scheme`.
- **Độ ưu tiên = thứ tự khai báo**: hai trục override cùng một token có độ đặc hiệu bằng nhau, và trục được khai báo **sau** sẽ thắng.
- **Tên trục/variant không được là số nguyên** (`100`, `2024`): JS liệt kê các key dạng số trước và làm hỏng thứ tự. Hãy dùng `contrast100`.
- **Một key override phải tồn tại trong base** — một key chỉ tồn tại trong override sẽ không sinh ra utility nào và bị từ chối lúc parse.
- **Các override kết hợp giữa nhiều trục** (`[data-theme="dark"][data-palette="forest"]`) và các biến nằm ngoài `--sg-*` vẫn là CSS viết tay; xem bảng phạm vi trong [`examples/design-system/README.md`](../../examples/design-system/README.md).

`--sg-*` là một lớp biến trung gian giúp tránh tham chiếu vòng khi chuyển theme. Trong mã ứng dụng, hãy ưu tiên các class Tailwind chuẩn (`bg-primary`) hoặc `var(--color-primary)`. Các biến mà thư viện phát ra (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, …, và `--sg-sp-*` của spacing) là đầu ra công khai: alias trỏ vào chúng và CSS viết tay có thể đọc hoặc override chúng; đổi tên một biến là thay đổi phá vỡ tương thích (breaking change). Phiên bản 5.0 đã đổi tên các biến màu từ `--sg-<color>` sang `--sg-color-<key>`; `style-gen doctor` cảnh báo kèm `file:line` cho mọi `var(--sg-<colorKey>)` hoặc khai báo `--sg-<colorKey>:` còn sót lại (xem [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md)).

### Đổi thuộc tính và scope (`axes`)

Theo mặc định, selector là `html[data-<axis-kebab>="<variant-kebab>"]`. `options.axes` đổi tên thuộc tính theo từng trục và cho phép bạn bỏ ghim `html`:

```typescript
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  axes: {
    attribute: { theme: "data-mode" }, // axis → attribute name; axes not listed keep data-<axis-kebab>
    scope: "element", // "root" (default) | "element"
  },
});
```

```css
[data-mode="dark"] { … }            /* scope: "element" — no html */
html[data-palette="forest"] { … }   /* scope: "root" — default */
```

- **`attribute` là một map**, không phải một hàm: `style-gen.config.json` có thể biểu diễn nó. Tên phải khớp `[a-z][a-z0-9-]*` (chữ thường như `data-<axis-kebab>` mặc định; nó được nhúng vào selector). `themeAxisAttributes(state, { attribute })` từ `./recipes` đọc đúng map này để DOM và CSS không bao giờ lệch nhau.
- **`scope: "root"`** giữ selector được ghim vào `html` như trong quy tắc ở trên. **`scope: "element"`** bỏ `html`, nên thuộc tính có thể đặt trên bất kỳ phần tử nào (một theme cục bộ cho một vùng).
- **Quy tắc alias khi `scope: "element"`.** Một alias `"$<key>"` vẫn được tính tại phần tử _khai báo_ nó (`:root`), nên nó giữ giá trị base bên trong phần tử mang thuộc tính. Vì vậy `generate()` ném `ZodError` khi một variant override một key `T` mà một mục khác `H` trỏ alias tới (trực tiếp hoặc qua một chuỗi alias, ở bất kỳ nhóm token nào), trừ khi variant đó tự khai báo lại `H` (bằng giá trị literal hoặc `"$<key>"`). Alias của `H` được tra trong theme base **và** trong mọi variant khác của mọi trục (ví dụ `dark` viết `primary: "$brand"` trong khi `light` override `brand` mà không khai báo lại `primary`). Lỗi được định vị tại key bị override (`themeAxes.<axis>.<variant>.<category>.<key>`); với một chuỗi alias, mỗi mắt xích cũ được báo thành một lỗi riêng tại cùng path. Cách sửa: khai báo lại mục giữ alias trong variant, hoặc dùng `scope: "root"`.
- **Việc kiểm tra thuộc tính chạy với mọi `scope`:** một key trong `attribute` phải là tên của một trục trong `themeAxes` (lỗi tại `axes.attribute.<axis>`), và hai trục không được phân giải về cùng một tên thuộc tính (ví dụ `attribute: { theme: "data-palette" }` khi đã có trục `palette`; lỗi tại `axes.attribute.<axis>`).
- **Một variant tên `base` là tên dành riêng:** `"base"` nghĩa là "không override" (`ThemeAxesState`, `themeAxisAttributes`), nên `ThemeSchema` từ chối `themeAxes.<axis>.base`. Hãy chọn tên khác (`default`, `standard`). Một trục tên `base` vẫn hợp lệ.
- `generateThemeCss(theme, options)` nhận cùng `options` ở tham số thứ hai.

---

## Spacing helper

Thư viện sinh sẵn các utility `.sp-*` (một `@utility` cho mỗi key, với chuỗi giá trị dự phòng theo breakpoint nằm ngay trong utility) — không cần safelist theo từng giá trị. Các component chỉ đặt các biến `--sg-sp-*` inline bằng `resolveSpacingProps`:

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

<!-- snippet: no-check shows rendered output, not code -->

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

- `classNames` là một **chuỗi** (nối bằng dấu cách), không phải một mảng.
- **Quy tắc cùng phần tử:** các biến `--sg-sp-*` được đăng ký với `inherits: false`, nên một class `sp-*` chỉ đọc các biến được khai báo ngay trên chính phần tử đó; giá trị của phần tử cha không lan xuống phần tử con.
- Các prop hợp lệ là `SpacingKey`: `p`, `px`, `py`, `pt`, `pb`, `pl`, `pr`, `m`, `mx`, `my`, `mt`, `mb`, `ml`, `mr`, `gap`, `gap-x`, `gap-y`, `top`, `right`, `bottom`, `left`. `resolveSpacing(prop, value, unit?)` xử lý một prop đơn lẻ; `unit` mặc định là `0.25` rem.
- Chỉ các breakpoint trong `options.breakpoints` (mặc định `["md", "lg"]`) mới có chuỗi giá trị dự phòng. Các kiểu mặc định cũng chỉ chấp nhận `md`/`lg` (`DefaultBreakpointKeys`); khi bạn đặt `options.breakpoints` khác, hãy truyền cùng các key đó làm đối số kiểu: `resolveSpacingProps<"md" | "lg" | "xl">(…)`, `ResponsiveValueStrict<number, "md" | "lg" | "xl">`.
- Tắt bằng `spacing: { enabled: false }`; tùy biến bằng `spacing: { properties: { inset: ["top", "bottom"] } }` (spacing key → danh sách các thuộc tính CSS mà nó đặt; giá trị luôn là `var(--sg-sp-<key>)`, nên không cần khai báo).
- `generate()` kiểm tra mọi tùy chọn bằng một schema chặt chẽ và ném `ZodError` kèm path: các key lạ bị từ chối (kể cả bên trong `spacing` và `typography`); `enableResponsive`, `spacing.enabled`, `typography.cssVarDriven` phải là boolean; các phần tử của `breakpoints`, các key của `screens` và `spacing.properties` tuân theo ngữ pháp key của theme (chữ cái, chữ số, `-`); mỗi giá trị của `screens` phải là một độ dài px/rem/em duy nhất, và map được merge với `defaultScreens` (px) chỉ được dùng một đơn vị (lỗi được báo tại `screens`); mỗi phần tử của `breakpoints` phải là tên của một screen trong `defaultScreens` hoặc `screens` (lỗi được báo tại `breakpoints.<i>`); tên thuộc tính CSS trong `spacing.properties` phải viết thường (`padding`, `column-gap`, `--custom`).

---

## Xây dựng component

Phần này đi từ theme đến component, theo thứ tự các file trong `examples/design-system` (một workspace package được ứng dụng harness (bộ ví dụ dùng để kiểm thử DX) `react-v4` sử dụng; chi tiết trong [`examples/design-system/README.md`](../../examples/design-system/README.md)). Mỗi bước chỉ import từ các subpath an toàn trên trình duyệt (`./tokens`, `./cva`, `./recipes`, `./types`), không bao giờ kéo Zod hay Node vào client bundle.

```text
src/theme.json         → theme (source of truth)
src/style-gen.options.ts → shared options (bundler, tokens, recipe)
src/tokens.ts          → createDesignTokens(theme, options)
src/recipes/*.ts       → headless recipes (cva + createVariantMapper)
src/cn.ts              → clsx + tailwind-merge aware of the theme's tokens
src/axes.ts            → themeAxisAttributes<Theme>
```

### 1. Theme

Một file JSON duy nhất như trong [Tạo theme config](#tạo-theme-config). Hãy import nó như một module (`resolveJsonModule`) để giữ kiểu literal của từng key:

```typescript
import themeJson from "./theme.json";

export type Theme = typeof themeJson; // input of ColorVariant<Theme>, ThemeAxesState<Theme>, …
export const theme = themeJson;
```

### 2. Tùy chọn dùng chung: `style-gen.options.ts`

Mọi nơi gọi `generate()` (plugin Vite, plugin Next, `createDesignTokens`, các kiểu của recipe) phải thấy **cùng một** bộ tùy chọn, nếu không `@source inline` và các token sẽ lệch nhau. Hãy đặt chúng trong một module không có dependency:

```typescript
// src/style-gen.options.ts
import type { StyleGeneratorOptions } from "@duydpdev/style-generator/types";

export const options = {
  breakpoints: ["md", "lg"],
} as const satisfies StyleGeneratorOptions;
```

Hãy dùng `as const satisfies` với `import type`, không dùng `defineOptions()`: `defineOptions` chỉ tồn tại ở root `.` (nó kéo Zod vào browser bundle), trong khi file này được nạp cả bởi config bundler dưới Node (type stripping) lẫn trong trình duyệt. Tuple `breakpoints` dạng literal là thứ thu hẹp `BreakpointKeys<typeof options>` thành `"md" | "lg"`. Nếu dự án cũng dùng CLI (`style-gen generate`), `style-gen.config.json` phải lặp lại các giá trị này; ví dụ có một test để hai bản sao không lệch nhau.

### 3. Token

`generate()` trả về `tokens`; để dùng chúng ở client, hãy dựng một bộ riêng, an toàn trên trình duyệt, bằng `createDesignTokens` từ `./tokens`:

```typescript
// src/tokens.ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";

import { options } from "./style-gen.options";
import themeJson from "./theme.json";

export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;
```

**Các token trong `DesignTokens.Web`:**

| Token               | Mô tả                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| `colors`            | Mọi key của color (phẳng, camelCase)                                                              |
| `typography`        | Các key của `typography`                                                                          |
| `shadows`           | Các key của `shadows`                                                                             |
| `backDropBlurs`     | Các key của `backDropBlurs`                                                                       |
| `fontFamily`        | Các key của `fontFamily`                                                                          |
| `borderWidth`       | Các key của `borderWidth` (mặc định `0, 1, 2, 4` khi vắng mặt hoặc `{}`)                          |
| `borderRadius`      | Các key của `borderRadius` (mặc định `DEFAULT_ROUNDED_VALUES` khi vắng mặt hoặc `{}`)             |
| `spacingProperties` | Danh sách các prop spacing — các key của `options.spacing.properties` hoặc giá trị mặc định       |
| `breakpoints`       | Các breakpoint đang dùng — mặc định `["md", "lg"]`                                                |
| `screens`           | Map breakpoint → độ rộng: các screen mặc định cộng với các key của `options.screens`              |
| `opacities`         | `options.coverage.colors.opacities`, tăng dần (`[]` khi không có); literal khi options là literal |
| `aliasedColors`     | Các key `colors` có giá trị là alias `"$<key>"` trong base record hoặc một override `themeAxes`   |

Tên của mỗi mảng khớp với trường `ThemeConfig` tương ứng (`DesignTokens.Web.colors` chứa các key của `theme.colors`); `spacingProperties`, `breakpoints`, `screens` đến từ các tùy chọn. Mọi mảng đều là `readonly`, và các tùy chọn được suy luận thành literal (`generate`, `createDesignTokens`, `defineOptions` nhận một `const O`): `breakpoints: ["md", "xl"]` cho `DesignTokens.Web.breakpoints` kiểu `readonly ("md" | "xl")[]`. Khi các tùy chọn được khai báo với kiểu `StyleGeneratorOptions`, hoặc với một đối số kiểu tường minh chỉ cho theme (`createDesignTokens<typeof theme>(theme, { breakpoints: ["xl"] })`), hai trường đó mở rộng thành `readonly string[]`; hãy bỏ đối số kiểu để giữ các literal. Khi không truyền `options`, các giá trị mặc định được dùng (`readonly ("md" | "lg")[]`). `aliasedColors` được tính lúc runtime từ base record và mọi override; kiểu của nó giữ mỗi key có giá trị là một `$…` literal hoặc `string`. Các kiểu liên quan: `DesignTokensWeb<TTheme, O>`, `DesignTokensResult<TTheme, O>`; `ThemeAxisName`, `ThemeAxisVariant`, `ThemeAxesState` định kiểu cho các thuộc tính `data-<axis>` (key và giá trị là các key gốc trong theme, còn thuộc tính/selector được sinh ra là kebab-case: `colorMode` + `high-contrast` → `html[data-color-mode="high-contrast"]`).

### 4. Recipe: `createVariantMapper` + `COLOR_STATES`

Với các key ngang hàng `primaryHover`/`primaryActive` trong theme, `{ states }` gộp chúng vào class của key gốc:

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

Hãy luôn truyền `COLOR_STATES` thay vì gõ tay `["hover", "active"]` — đó cũng chính là danh sách mà các dòng `@source inline` dùng. Hãy truyền các key camelCase như những key mà `DesignTokens.Web.colors` cung cấp (`primaryHover`, không phải `primary-hover`).

`prefix` có kiểu `RegistryPrefix | ""` (các tiền tố mà registry phát ra `@source inline` cho chúng; `""` dành cho typography), nên `createVariantMapper("fill", …)` hoặc một tiền tố nằm trong biến kiểu `string` là lỗi kiểu: chúng ánh xạ ra các class mà không dòng `@source inline` nào giữ lại. Để bỏ qua kiểm tra cho một tiền tố đơn lẻ, hãy truyền `{ allowUnregisteredPrefix: true }` làm đối số thứ ba và khai báo các class trong `extraSources`. Không thể kết hợp điều này với `{ states }` hoặc một mảng tiền tố.

Một recipe headless ghép các mapper bằng `cva`; component framework (React, Vue) chỉ bọc nó lại. Điểm neo DX là `satisfies` trên danh sách intent: đổi tên hoặc xóa một color trong `theme.json` và trình biên dịch chỉ ra đúng dòng đó, thay vì phát ra một class không còn tồn tại.

<!-- snippet: no-check imports ../tokens from src/recipes/button.ts, type-checked by the design-system example -->

```typescript
// src/recipes/button.ts (abridged)
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

Tất cả recipe của ví dụ đều theo pattern này. Các class có modifier độ mờ (`bg-primary/10`) mặc định không được bao phủ: hãy viết chúng nguyên văn trong một file nguồn mà Tailwind quét (như các recipe làm), hoặc liệt kê các bước trong `coverage.colors.opacities` để mọi color đều có chúng qua `@source inline` (xem [`coverage`](./reference/options.md#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token)).

### 5. `cn`: gộp class có nhận biết các token của theme

Theo mặc định, `tailwind-merge` không biết `text-16-medium`, `shadow-md` hay `rounded-pill` của theme bạn, nên nó có thể giữ nhầm class. `createCn` (từ `./ui`) bọc `clsx` và một `tailwind-merge` được mở rộng bằng `createTailwindMergeExtension` (từ `./recipes`); `class-variance-authority`, `clsx` và `tailwind-merge` vẫn là các dependency của ứng dụng:

```typescript
// src/cn.ts
import { createCn } from "@duydpdev/style-generator/ui";

import { tokens } from "./tokens";

export const cn = createCn(tokens);
```

`cn("text-16-medium", "text-32-bold")` giữ class sau, và `cn("rounded-md", "rounded-pill")` cũng vậy. Các component gọi `cn(buttonRecipe({ … }), className)`.

### 6. Bật các trục theme trên DOM: `themeAxisAttributes`

`themeAxisAttributes<Theme>(state, attributes?)` trả về các thuộc tính `data-*` của những trục đang hoạt động, được định kiểu từ `theme.json`; `"base"` hoặc một trục bị bỏ qua không phát ra gì. Theo mặc định thuộc tính là `data-<axis>`; khi `options.axes.attribute` đổi tên thuộc tính, hãy truyền cùng map đó làm đối số thứ hai để DOM và các selector CSS không lệch nhau:

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

Hãy spread kết quả lên `<html>` (React: `<html {...axisAttributes(state)}>`; Nuxt: `useHead({ htmlAttrs: axisAttributes(state) })`). Nếu `options.axes.attribute` đổi tên thuộc tính, hãy truyền cùng map đó làm tham số thứ hai (`{ attribute }`).

### 7. Prop spacing: `splitSpacingProps`

Một component nhận các prop spacing (`p`, `px`, `gap`, …, một số hoặc `{ base, md, lg }`) tách chúng khỏi phần còn lại bằng `splitSpacingProps` từ `./recipes`; kiểu `SpacingProps<BreakpointKeys<typeof options>>` lấy các key breakpoint từ các tùy chọn, nên `{ xl: 4 }` là lỗi kiểu khi `xl` không có trong `breakpoints`:

```typescript
import { splitSpacingProps } from "@duydpdev/style-generator/recipes";
import { tokens } from "./tokens";

declare const props: {
  p: number;
  mx: { base: number; md: number };
  id: string;
};

const { spacing, rest } = splitSpacingProps(props, tokens.spacingProperties);
// with props = { p: 4, mx: { base: 2, md: 4 }, id: "x" }:
// spacing.className → "sp-p sp-mx"
// spacing.style     → { "--sg-sp-p": "1rem", "--sg-sp-mx": "0.5rem", "--sg-sp-mx-md": "1rem" }
// rest → the remaining props (className, children, …)
```

---

## Mẹo TypeScript

### `defineTheme()` — kiểm tra kiểu và kiểm tra hợp lệ

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

TypeScript báo lỗi ngay khi thiếu `colors`; lúc runtime `defineTheme` ném `ZodError` (kèm `path`) cho key lạ hoặc giá trị không an toàn. Nó chỉ tồn tại ở barrel root `.` — không có trong `./tokens`, để Zod không rò rỉ vào các subpath dùng trên trình duyệt. `generate()` luôn kiểm tra lại, nên `defineTheme` là tùy chọn. Để in lỗi dễ đọc, hãy bọc lời gọi trong `catch` và truyền `ZodError` cho `formatZodError` (cũng được export từ `.`): nó trả về một dòng `path → message` cho mỗi vấn đề.

### Alias kiểu ngữ nghĩa

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

### Giá trị responsive — chỉ có chế độ strict

`ResponsiveValueStrict` là kiểu responsive duy nhất; một breakpoint gõ sai (`{ typo: 4 }`) là lỗi kiểu, và `base` luôn được phép:

```typescript
import type { ResponsiveValueStrict } from "@duydpdev/style-generator/spacing";

// "base" is always valid; every other key must be declared in `options.breakpoints`
// and present in `screens` (or `defaultScreens`), otherwise there is no matching CSS.
type AppBreakpoints = "mobile" | "tablet" | "laptop" | "desktop";
export type ResponsiveValue<T> = ResponsiveValueStrict<T, AppBreakpoints>;
```

---

## Nâng cấp từ phiên bản cũ

- **4.x → 5.0.0** (thay đổi phá vỡ tương thích (breaking change): `--sg-color-*`, `borderWidth` thông qua `@theme`, `spacing.properties` là một mảng, đổi tên các key của `DesignTokens.Web`, typography chặt chẽ hơn, Node runner: phát ra trong `buildStart`, plugin không đối số, `resolveProjectPath`, mã thoát CLI + flag chặt chẽ, các lệnh `tokens`/`budget`, `resetTailwindDefaults`, variant `base` dành riêng, khai báo `.d.cts`): [`migration/4.x-to-5.0.md`](./migration/4.x-to-5.0.md).
- **3.x → 4.0.0** (thay đổi phá vỡ tương thích (breaking change): chỉ Tailwind v4, `generate()` thay thế plugin + safelist, schema chặt chẽ, `themeAxes`, `borderWidth`, `--sg-sp-*`): [`migration/3.x-to-4.0.md`](./migration/3.x-to-4.0.md), gồm một bảng trước/sau và một runbook rollback.
- Đợt triển khai subpath export của 3.x (mang tính lịch sử, vẫn mang yêu cầu về `moduleResolution`): [`migration/3.x-subpath-exports.md`](../migration/3.x-subpath-exports.md).
- Key `themes` một trục đã được đổi tên thành `themeAxes`; một theme vẫn dùng tên cũ bị từ chối kèm một thông báo giải thích việc đổi tên (nguyên văn trong hướng dẫn nâng cấp).
- Các phiên bản major cũ hơn: 2 → 3 loại bỏ các object color lồng nhau và key `DEFAULT` (chỉ còn các key camelCase phẳng); 1 → 2 làm phẳng các nhóm color `base`/`text`/`common`.
