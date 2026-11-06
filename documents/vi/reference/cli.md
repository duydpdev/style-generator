<!-- source: documents/reference/cli.md sha256: b09ec3c2dce8 -->

# CLI

Công cụ dòng lệnh `style-gen`: `init`, `generate`, `schema`, `doctor`, `tokens` và `budget`.

> **Cảnh báo:** Hãy cài đặt package trước và luôn chạy CLI thông qua trình quản lý package của bạn (`yarn style-gen …`). Đừng bao giờ chạy qua `npx`: cái tên `style-gen` chưa được đăng ký trên npm registry công khai, vì vậy `npx` có thể tải về một package không liên quan. Với npm, hãy dùng `npm exec --no -- style-gen` để nó chỉ phân giải bản cài đặt cục bộ của bạn.

## Lệnh

### `style-gen init`

> **Thay đổi trong 5.2.0:** `init` không còn tạo sẵn file `plugins/theme-plugin.ts`, không còn hỏi vị trí generator script và từ chối cờ `--plugin` (tùy chọn không nhận diện, mã thoát 1); thay vào đó nó in ra cách nối dây bundler bên dưới và ngừng ghi `plugin` vào `style-gen.config.json`. Từ 6.0.0, một file config vẫn còn `plugin` bị từ chối như mọi key lạ khác (`doctor` dừng với `plugin → Unrecognized key: "plugin"`), và `init` bỏ key đó khi gộp. Để nâng cấp, hãy thêm đoạn mã được in ra vào cấu hình bundler của bạn (hoặc chạy `style-gen generate`), sau đó xóa file script và key `plugin`.

Tạo sẵn file theme JSON, JSON Schema của nó và `style-gen.config.json`, sau đó in ra cách nối dây chúng vào stack của bạn. `init` không bao giờ tự sửa file cấu hình của bundler.

Trình hướng dẫn sẽ hỏi vị trí file theme và có muốn kèm theo template dark mode hay không. Chế độ không tương tác: `yarn style-gen init --dark`. Lệnh sẽ ghi theme, file `theme.schema.json` của nó (cho trường `"$schema"` của theme) và `style-gen.config.json` (hợp nhất `theme` và `output` vào file hiện có và giữ nguyên các key khác và bỏ key `plugin`, vì 6.0 không còn chấp nhận nó). Nếu theme hoặc schema đã tồn tại, nó sẽ hỏi trước khi ghi đè (không tương tác: thoát với mã 1).

Sau đó nó sẽ tìm file cấu hình bundler trong thư mục gốc của dự án theo thứ tự sau, rồi in ra đoạn mã cần thêm vào đó cùng hai dòng CSS `@import`:

| File cấu hình tìm thấy | Đoạn mã nối dây được in ra                                                                                                           | Dòng `@import` được in ra cho                                         |
| :--------------------- | :----------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `nuxt.config.*`        | `styleGenVite({ themePath, outDir, options: {} })` trong `vite.plugins` với đường dẫn tuyệt đối, và `css: ["~/assets/css/main.css"]` | `app/assets/css/main.css` (`assets/css/main.css` nếu không có `app/`) |
| `next.config.*`        | `styleGenNext()(nextConfig)`                                                                                                         | `app/globals.css` (`src/app/globals.css` khi có `src/app/`)           |
| `vite.config.*`        | `styleGenVite()` đứng trước `tailwindcss()` trong `plugins`                                                                          | `src/index.css` (`index.css` nếu không có `src/`)                     |
| không có               | `yarn style-gen generate` (`--watch` trong khi bạn chỉnh sửa theme)                                                                  | một file CSS cạnh file `theme.css` được sinh ra                       |

`*` là `.ts`, `.mts`, `.cts`, `.js`, `.mjs` hoặc `.cjs`; chỉ các file nằm trực tiếp tại thư mục gốc của dự án mới được tính (có hỗ trợ symlink). Cấu hình framework được ưu tiên hơn `vite.config.*` vì các ứng dụng Next.js và Nuxt thường giữ lại một file cho Vitest. `styleGenVite()` và `styleGenNext()` khi gọi không có đối số sẽ đọc `style-gen.config.json` từ thư mục gốc của Vite và từ `process.cwd()`, nhờ đó theme, output và mọi tùy chọn vẫn nằm trong file đó. Nuxt 4 đặt thư mục gốc của Vite thành `app/`, và `styleGenVite` chỉ ghi bên trong thư mục gốc đó, vì vậy đoạn mã cho Nuxt truyền đường dẫn tuyệt đối và theme của Nuxt mặc định là `app/assets/css/theme.json`; với thư mục `app/`, một `--theme` nằm ngoài nó sẽ in cảnh báo (mã thoát 0) vì dev server sẽ từ chối `outDir` đó. Khi truyền đường dẫn tường minh, plugin sẽ không đọc `style-gen.config.json`: hãy đặt các tùy chọn generator vào `options: {}` trong đoạn mã, như cách `examples/nuxt-v4/nuxt.config.ts` làm; khi đó `style-gen.config.json` chỉ phục vụ CLI (`generate`, `doctor`, `tokens`). Mọi đường dẫn được in ra hoặc lưu trữ đều tương đối với thư mục gốc của dự án và dùng dấu phân cách `/` (một `--theme` tuyệt đối nằm trong thư mục gốc sẽ được lưu dưới dạng tương đối), và các đường dẫn bên trong chuỗi string in ra đều được escape dạng JSON. Các đoạn mã dùng cú pháp ES module; một cấu hình CommonJS (`.cjs`, hoặc `.js` không có `"type": "module"`) sẽ nạp các hàm tương tự bằng `require()`. Một file `next.config.*` bằng JavaScript sẽ nhận comment JSDoc `@type` thay vì `import type`.

```bash
yarn style-gen init            # Interactive mode
yarn style-gen init --dark     # Non-interactive, with a themeAxes.theme.dark template
```

| Cờ        | Kiểu      | Mặc định            | Mô tả                            |
| :-------- | :-------- | :------------------ | :------------------------------- |
| `--theme` | `string`  | `styles/theme.json` | Đường dẫn đến file theme         |
| `--dark`  | `boolean` | `false`             | Kèm theo template trục dark-mode |

Mặc định của `--theme` trở thành `src/styles/theme.json` khi có thư mục `src/`, và `app/assets/css/theme.json` (`assets/css/theme.json` nếu không có `app/`) khi tìm thấy `nuxt.config.*`. CSS được ghi ngay cạnh theme (`theme.css`).

### `style-gen generate`

Kiểm tra hợp lệ theme và ghi file CSS hoàn chỉnh (`@theme`, các biến `:root`, override cho trục, `@theme inline`, các khối `@utility`, `@source inline`).

```bash
yarn style-gen generate
yarn style-gen generate --theme ./theme.json --out ./theme.css --watch
```

| Cờ              | Kiểu      | Mặc định            | Mô tả                                       |
| :-------------- | :-------- | :------------------ | :------------------------------------------ |
| `--theme`       | `string`  | `styles/theme.json` | Đường dẫn đến file theme JSON               |
| `--out`         | `string`  | `styles/theme.css`  | Đường dẫn đến file CSS đầu ra               |
| `-w`, `--watch` | `boolean` | `false`             | Chế độ watch — tự động sinh lại mỗi khi lưu |

Dạng truyền vị trí `style-gen generate <theme> <out>` cũng hoạt động; các cờ được ưu tiên hơn. File được ghi một cách nguyên tử và **chỉ khi nội dung của nó có sự thay đổi** (chạy lại trên một theme chưa đổi sẽ không chạm vào file, giúp các file watcher không bị kích hoạt). `--theme` có thể trỏ ra ngoài dự án (một package design-system dùng chung); `--out` và `output` trong config phải nằm bên trong dự án (`output escapes project root: <path>`). Một theme không hợp lệ (`Invalid theme (<path>):`), tùy chọn không hợp lệ (`Invalid options:`) hoặc cặp theme × options không hợp lệ (`Invalid theme/options:`), file config không hợp lệ (`Invalid config (<file>):` theo sau là từng dòng `path → message` cho mỗi lỗi, ví dụ `extraSources.<i>` cho một mục `extraSources` sai hoặc `breakpoint` do gõ nhầm) hoặc lỗi ghi file sẽ giữ nguyên file output và thoát với mã 1. File config sai định dạng (không phải JSON) sẽ bị cảnh báo và các giá trị mặc định sẽ được dùng.

`--watch` sẽ chạy lại mỗi khi có thay đổi trong theme **và trong file config** (`style-gen.config.json`, hoặc `package.json` chứa nó). Config được đọc lại sau mỗi lần thay đổi, nhờ đó `output`, `breakpoints`, `resetTailwindDefaults` mới … được áp dụng mà không cần khởi động lại; chỉnh sửa config không hợp lệ sẽ được báo cáo và **config hợp lệ gần nhất vẫn giữ hiệu lực** cho đến khi file được sửa lại đúng. Một theme không thể đọc khi khởi động (file không tồn tại, là thư mục) hoặc config không hợp lệ khi khởi động sẽ thoát với mã 1 trước khi bất kỳ watcher nào bắt đầu; khi đang watch, lỗi theme hoặc lỗi ghi file sẽ được ghi log và quá trình watch vẫn tiếp tục.

### `style-gen schema`

Ghi JSON Schema của theme (từ `z.toJSONSchema(ThemeSchema)`) để editor có thể tự hoàn thành các key và đánh dấu key lạ khi theme khai báo `"$schema"`. Khi không có `--out`, nó sẽ ghi `theme.schema.json` cạnh `theme` đã cấu hình (mặc định `styles/theme.json`), nơi `"$schema": "./theme.schema.json"` tìm đến; file config khi đó được đọc tương tự cách `generate` đọc, vì vậy config không hợp lệ schema sẽ thoát với mã 1 và không ghi gì cả.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme)
yarn style-gen schema --out styles/theme.schema.json
```

### `style-gen doctor`

Kiểm tra thiết lập: file config (một `style-gen.config.json` hoặc `package.json["style-gen"]` sai định dạng là một lỗi — `generate` cảnh báo và dùng mặc định — và file không hợp lệ schema cũng vậy: các key của config và giá trị tùy chọn được kiểm tra bằng cùng schema như `generate()`, nên cả hai lệnh đều đưa ra cùng kết luận, và `doctor` in ra `Config (<file>) ❌ Invalid` kèm danh sách lỗi; **lỗi config sẽ dừng `doctor` ngay tại đó**, vì mọi bước kiểm tra sau đó đều sẽ chạy trên các mặc định sai), cú pháp JSON, kiểm tra hợp lệ `ThemeSchema` (mỗi vấn đề in ra dạng `path → message`), **cặp theme × options** (`❌ Invalid theme/options`: token giữ alias `$` bị lỗi thời dưới `axes.scope: "element"`, hai trục dùng chung một thuộc tính, `resetTailwindDefaults: ["radius"]` mà không có `borderRadius`, …), và file output. Theme nằm ngoài dự án vẫn hợp lệ; `output` đã cấu hình mà vượt ra ngoài thư mục gốc của dự án là một lỗi. Lệnh này cũng in ra các cảnh báo — không bao giờ là lỗi — đối với các key hợp lệ schema nhưng xung đột với utility của Tailwind (ví dụ `none` trong `colors`/`shadows`/`borderRadius`, các key `borderWidth` chỉ gồm số, các key `colors` có class `ring-`/`outline-`/`divide-` là một static của Tailwind (`inset` → `ring-inset`, `solid` → `outline-solid`, `xReverse` → `divide-x-reverse`) hoặc một độ rộng/offset số nguyên (`3` → `ring-3`, `offset2` → `ring-offset-2`), hoặc các key typography như `textSm`, `h1` → `h-1`, `italic`), và một **gợi ý alias** cho mỗi override `themeAxes` có giá trị literal lặp lại giá trị của một base key khác trong cùng nhóm token (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): một alias sẽ tự thay đổi theo primitive khi bảng màu base thay đổi, còn literal lặp lại thì không.

Lệnh cũng quét các file mã nguồn trong thư mục hiện tại (`.css`, `.scss`, `.ts`, `.tsx`, `.vue`, `.svelte`, `.astro`, `.html`, …) và cảnh báo `file:line` về các biến màu trước bản 5.0 còn sót lại; các thư mục build, `node_modules`, file `output` trong config và các file trên 1 MiB sẽ được bỏ qua.

```bash
yarn style-gen doctor
```

### `style-gen tokens`

Ghi các **key** design token của theme (`DesignTokens.Web`: một mảng các camelCase key cho mỗi nhóm token, cộng thêm `opacities` (các bước của `coverage.colors.opacities`, tăng dần; `[]` khi không có tùy chọn), `breakpoints`, `screens` và `spacingProperties`) dưới dạng một module TypeScript, nhờ đó client bundle có thể import danh sách key mà không cần kèm theo runtime `./tokens` hay file theme JSON (khoảng 2.4 kB gzip khi đi chung, so với khoảng 0.6 kB cho các key được sinh ra).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (next to the theme)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

Module có dạng `export const tokens = {…} as const` cùng `export type Tokens = typeof tokens`; nó được dựng bằng chính mã nguồn của `createDesignTokens()`, với `breakpoints`/`screens`/`spacing` từ config, vì vậy cả hai không thể lệch nhau. Theme và các tùy chọn được kiểm tra hợp lệ tương tự trong `generate`; output mặc định nằm cạnh theme và phải ở bên trong dự án, vì vậy theme ở ngoài dự án cần có `--out`. Hãy chạy lại lệnh này (hoặc đặt nó cạnh `generate` trong script của bạn) mỗi khi key của theme thay đổi.

### `style-gen budget`

Làm thất bại CI khi CSS sau khi build vượt quá ngân sách dung lượng gzip: lệnh tính tổng dung lượng gzip (mặc định của `node:zlib`) của một file `.css`, hoặc của mọi file `.css` trong một thư mục (duyệt đệ quy, ví dụ `.next/static/css` hoặc `dist/assets`).

```bash
yarn style-gen budget .next/static/css --max-gzip 14925
```

Khi thành công nó in ra dòng tóm tắt `OK: …`; khi vượt ngân sách nó in `OVER BUDGET: …` và thoát với mã 1. Các mã thoát: `0` trong ngân sách, `1` vượt ngân sách, `2` lỗi cách dùng, target không đọc được hoặc không tìm thấy CSS. Cờ `--max-gzip` là bắt buộc. Lệnh này thay thế script `check-css-budget.mjs` mà trước đây consumer thường phải sao chép.

### `style-gen --version`

In ra phiên bản CLI đã cài đặt.

### Trợ giúp và mã thoát

`style-gen --help` liệt kê các lệnh; `style-gen <command> --help` in ra các tùy chọn của lệnh đó. Các cờ được phân tích nghiêm ngặt: **cờ lạ là một lỗi** (`--them` không còn âm thầm quay về theme mặc định), và lệnh lạ cũng vậy. Mọi lệnh đều thoát với mã `0` khi thành công, khi gọi `--help`, `--version` hoặc khi hủy prompt, và thoát với mã `1` khi thất bại (`budget` dùng `2` cho lỗi sử dụng, xem ở trên).

## File cấu hình

```json
{
  "theme": "styles/theme.json",
  "output": "styles/theme.css",
  "breakpoints": ["md", "lg"],
  "extraSources": ["hover:bg-{primary,secondary}"]
}
```

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography`, `extraSources`, `coverage`, `axes` và `resetTailwindDefaults` được chuyển tiếp đến `generate()`. Bất kỳ key nào khác — một lỗi gõ nhầm như `breakpoint`, hoặc key 3.x cũ như `responsiveModules` — đều bị từ chối; chỉ `$schema`, `theme` và `output` được chấp nhận ngoài các key chuyển tiếp. `plugin`, key mà `init` từng ghi trước bản 5.2.0 để đặt tên cho generator script mà nó tạo sẵn, bị từ chối từ 6.0.0 (hãy xóa nó, hoặc chạy `style-gen init`, lệnh này sẽ bỏ nó). `styleGenVite()` và `styleGenNext()` khi gọi **không có đối số** sẽ đọc chính file này (xem [Vite](./vite.md) / [Next](./next.md)). CLI phân giải cấu hình theo thứ tự sau, cho từng key:

1. các cờ của lệnh
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. các giá trị mặc định tích hợp sẵn

Hai nguồn file là các lựa chọn thay thế cho nhau, không phải xếp lớp chồng lên nhau: CLI đọc `style-gen.config.json` khi nó tồn tại và chỉ đọc `package.json["style-gen"]` khi file trên không tồn tại, và không bao giờ merge cả hai (một file `style-gen.config.json` sai định dạng sẽ được báo cáo, chứ không bị thay thế bởi phần cấu hình trong `package.json`). Các cờ sẽ override từng key đơn lẻ của bất kỳ file nào đã được đọc, và các giá trị mặc định sẽ điền vào các key chưa được thiết lập.
