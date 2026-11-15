<!-- source: documents/reference/cli.md sha256: 3324f28ef2e5 -->

# CLI

Công cụ dòng lệnh `style-gen`: `init`, `generate`, `schema`, `doctor`, `tokens` và `budget`.

> **Cảnh báo:** Hãy cài đặt package trước và luôn chạy CLI thông qua trình quản lý package của bạn (`yarn style-gen …`). Đừng bao giờ chạy qua `npx`: cái tên `style-gen` chưa được đăng ký trên npm registry công khai, vì vậy `npx` có thể tải về một package không liên quan. Với npm, hãy dùng `npm exec --no -- style-gen` để nó chỉ phân giải bản cài đặt cục bộ của bạn.

## Lệnh

### `style-gen init`

Tạo sẵn file theme JSON, JSON Schema của nó, `style-gen.config.json` và JSON Schema của config, sau đó in ra cách nối dây chúng vào stack của bạn. `init` không bao giờ tự sửa file cấu hình của bundler.

Trình hướng dẫn sẽ hỏi vị trí file theme và có muốn kèm theo template dark mode hay không. Khi không có terminal, hoặc để bỏ qua trình hướng dẫn: `yarn style-gen init --dark`, `--theme` hoặc `--yes`.
Lệnh sẽ ghi theme, file `theme.schema.json` của nó (cho trường `"$schema"` của theme), `style-gen.config.json` và `style-gen.config.schema.json` (cho trường `"$schema"` của config, mà `init` thêm làm key đầu tiên của config)
(hợp nhất `theme`, `output` và `$schema` vào config hiện có và giữ nguyên các key khác như đang có, kể cả `$schema` mà nó đã có).
Nếu theme hoặc một trong hai file schema đã tồn tại, nó sẽ hỏi trước khi ghi đè (không tương tác: thoát với mã 1; với `--yes`: giữ nguyên các file và thoát với mã 0).

Sau đó nó sẽ tìm file cấu hình bundler trong thư mục gốc của dự án theo thứ tự sau, rồi in ra đoạn mã cần thêm vào đó cùng các dòng CSS (hai dòng `@import`, thêm `@source not "<path>/.claude";` khi file [rules cho agent](#rules-cho-agent) tồn tại):

| File cấu hình tìm thấy | Đoạn mã nối dây được in ra                                                                                     | Dòng `@import` được in ra cho                                         |
| :--------------------- | :------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------- |
| `nuxt.config.*`        | `styleGenVite({ root })` trong `vite.plugins` với `root` là thư mục dự án, và `css: ["~/assets/css/main.css"]` | `app/assets/css/main.css` (`assets/css/main.css` nếu không có `app/`) |
| `next.config.*`        | `styleGenNext()(nextConfig)`                                                                                   | `app/globals.css` (`src/app/globals.css` khi có `src/app/`)           |
| `vite.config.*`        | `styleGenVite()` đứng trước `tailwindcss()` trong `plugins`                                                    | `src/index.css` (`index.css` nếu không có `src/`)                     |
| không có               | `yarn style-gen generate` (`--watch` trong khi bạn chỉnh sửa theme)                                            | một file CSS cạnh file `theme.css` được sinh ra                       |

`*` là `.ts`, `.mts`, `.cts`, `.js`, `.mjs` hoặc `.cjs`; chỉ các file nằm trực tiếp tại thư mục gốc của dự án mới được tính (có hỗ trợ symlink). Cấu hình framework được ưu tiên hơn `vite.config.*` vì các ứng dụng Next.js và Nuxt thường giữ lại một file cho Vitest. `styleGenVite()` và `styleGenNext()` không nhận tùy chọn nào ngoài `root`, thư mục chứa `style-gen.config.json` (mặc định: thư mục gốc của Vite và `process.cwd()`), nhờ đó theme, output, file tokens và mọi tùy chọn của generator đều nằm trong đúng một file đó; dev server đang chạy sẽ nhận thay đổi của file config. Nuxt 4 đặt thư mục gốc của Vite thành `app/`, nên đoạn mã cho Nuxt truyền `root` (thư mục dự án) và theme của Nuxt mặc định là `app/assets/css/theme.json`. Sau khi nối dây, hãy chạy `yarn style-gen generate` một lần và commit file `theme.tokens.ts` được sinh ra; giữ `theme.css` trong danh sách ignore. Mọi đường dẫn được in ra hoặc lưu trữ đều tương đối với thư mục gốc của dự án và dùng dấu phân cách `/` (một `--theme` tuyệt đối nằm trong thư mục gốc sẽ được lưu dưới dạng tương đối), và các đường dẫn bên trong chuỗi string in ra đều được escape dạng JSON. Các đoạn mã dùng cú pháp ES module; một cấu hình CommonJS (`.cjs`, hoặc `.js` không có `"type": "module"`) sẽ nạp các hàm tương tự bằng `require()`. Một file `next.config.*` bằng JavaScript sẽ nhận comment JSDoc `@type` thay vì `import type`.

```bash
yarn style-gen init            # Interactive mode
yarn style-gen init --dark     # Without the wizard, with a themeAxes.theme.dark template
yarn style-gen init --yes      # Defaults for every prompt, never overwrites (scripts, CI, coding agents)
```

| Cờ             | Kiểu      | Mặc định            | Mô tả                                                                 |
| :------------- | :-------- | :------------------ | :-------------------------------------------------------------------- |
| `--theme`      | `string`  | `styles/theme.json` | Đường dẫn đến file theme                                              |
| `--dark`       | `boolean` | `false`             | Kèm theo template trục dark-mode                                      |
| `--skip-rules` | `boolean` | `false`             | Không ghi file rules cho agent                                        |
| `--rules-only` | `boolean` | `false`             | Chỉ ghi hoặc làm mới file rules cho agent                             |
| `-y`, `--yes`  | `boolean` | `false`             | Trả lời mọi prompt bằng giá trị mặc định và không bao giờ ghi đè file |

`--yes` không bao giờ mở trình hướng dẫn hay đặt câu hỏi, kể cả trong terminal: nó dùng `--theme` và `--dark` khi có, và các mặc định của stack khi không. Khi theme hoặc một trong hai file schema đã tồn tại, nó giữ nguyên tất cả, in `Existing files kept (--yes never overwrites).`, vẫn làm mới rules cho agent (file rules đã sửa được giữ lại, như mọi lần chạy không tương tác) và thoát với mã 0, trong khi một lần chạy không có terminal và không có `--yes` thoát với mã 1.

Mặc định của `--theme` trở thành `src/styles/theme.json` khi có thư mục `src/`, và `app/assets/css/theme.json` (`assets/css/theme.json` nếu không có `app/`) khi tìm thấy `nuxt.config.*`. CSS được ghi ngay cạnh theme (`theme.css`).

#### Rules cho agent

`init` ghi `.claude/rules/style-generator.md`, tức [hợp đồng cho agent](../agent-contract.md) của phiên bản đang cài (dòng đầu ghi phiên bản). Các coding agent đọc `.claude/rules/` sẽ tuân theo nó khi viết theme và component. File này chứa các class literal làm ví dụ, và Tailwind quét cả thư mục ẩn, nên các dòng CSS được in ra kết thúc bằng `@source not "<path>/.claude";`.

| File rules trong dự án                                                      | `init` làm gì                                                                |
| :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| chưa có                                                                     | ghi file (`Created .claude/rules/style-generator.md`)                        |
| giống hệt bản của phiên bản này                                             | giữ nguyên (`Rules up to date: …`)                                           |
| ghi phiên bản khác                                                          | thay luôn, kể cả khi không tương tác (`Updated … (7.0.0 → 7.1.0)`)           |
| cùng phiên bản nhưng đã sửa, hoặc không có dòng phiên bản, chế độ tương tác | hỏi trước khi thay; từ chối hoặc huỷ prompt thì giữ file                     |
| cùng phiên bản nhưng đã sửa, hoặc không có dòng phiên bản, không tương tác  | giữ file và nhắc chạy `style-gen init --rules-only` trong terminal tương tác |

Sau khi nâng cấp, chạy `style-gen init --rules-only` để làm mới file: lệnh này không đụng tới theme, schema hay `style-gen.config.json`, không mở trình hướng dẫn, in các dòng CSS kèm `@source not` (đường dẫn CSS lấy từ `output` trong `style-gen.config.json` nếu có) và thoát với mã 0; nó không đi cùng `--theme`, `--dark` hay `--skip-rules` (mã 1). Một lần `init` thường mà giữ theme hiện có ở prompt ghi đè cũng cập nhật rules và in lại các bước tiếp theo. `--skip-rules` không ghi file rules. Một bản build thiếu rules (một lần `yarn build` cục bộ bỏ qua bước emit) sẽ in cảnh báo và thoát với mã 0.

Đây là các đoạn mã `init` in ra cho Next.js và Nuxt (đoạn cho Vite nằm trong [README](../README.md#bắt-đầu-nhanh)).

#### Next.js

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
@source not "../.claude";
```

#### Nuxt

Nuxt 4 đặt root của Vite là `app/`, nên theme nằm ở `app/assets/css/theme.json` và plugin nhận `root`, thư mục dự án chứa `style-gen.config.json`. Hãy đặt các tùy chọn của generator vào file đó.

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
      // Nuxt 4 sets Vite's root to app/: root is the folder with style-gen.config.json.
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },
});
```

Tạo `app/assets/css/main.css` (`init` không tạo file này; `css` trong `nuxt.config.ts` sẽ nạp nó):

```css
@import "tailwindcss";
@import "./theme.css";
@source not "../../../.claude";
```

### `style-gen generate`

Kiểm tra hợp lệ theme và ghi file CSS hoàn chỉnh (`@theme`, các biến `:root`, override cho trục, `@theme inline`, các khối `@utility`, `@source inline`) cùng module `theme.tokens.ts` có kiểu ngay cạnh nó. File tokens được ghi cạnh `theme.css`; hãy commit nó và giữ `theme.css` trong danh sách ignore.

```bash
yarn style-gen generate
yarn style-gen generate --theme ./theme.json --out ./theme.css --watch
```

| Cờ              | Kiểu      | Mặc định            | Mô tả                                                                                                  |
| :-------------- | :-------- | :------------------ | :----------------------------------------------------------------------------------------------------- |
| `--theme`       | `string`  | `styles/theme.json` | Đường dẫn đến file theme JSON                                                                          |
| `--out`         | `string`  | `styles/theme.css`  | Đường dẫn đến file CSS đầu ra                                                                          |
| `-w`, `--watch` | `boolean` | `false`             | Chế độ watch — tự động sinh lại mỗi khi lưu                                                            |
| `--check`       | `boolean` | `false`             | Không ghi gì; thoát với mã 1 khi `theme.tokens.ts` thiếu hoặc khác với kết quả sinh từ theme và config |

Dạng truyền vị trí `style-gen generate <theme> <out>` cũng hoạt động; các cờ được ưu tiên hơn. File được ghi một cách nguyên tử và **chỉ khi nội dung của nó có sự thay đổi** (chạy lại trên một theme chưa đổi sẽ không chạm vào file, giúp các file watcher không bị kích hoạt). `--theme` có thể trỏ ra ngoài dự án (một package design-system dùng chung); `--out` và `output` trong config phải nằm bên trong dự án (`output escapes project root: <path>`). Một theme không hợp lệ (`Invalid theme (<path>):`), tùy chọn không hợp lệ (`Invalid options:`) hoặc cặp theme × options không hợp lệ (`Invalid theme/options:`), file config không hợp lệ (`Invalid config (<file>):` theo sau là từng dòng `path → message` cho mỗi lỗi, ví dụ `breakpoint` do gõ nhầm hoặc `extraSources` cho một key đã bị loại bỏ ở 7.0) hoặc lỗi ghi file sẽ giữ nguyên file output và thoát với mã 1. File config sai định dạng (không phải JSON) sẽ bị cảnh báo và các giá trị mặc định sẽ được dùng.

`--watch` sẽ chạy lại mỗi khi có thay đổi trong theme **và trong file config** (`style-gen.config.json`, hoặc `package.json` chứa nó). Config được đọc lại sau mỗi lần thay đổi, nhờ đó `output`, `breakpoints`, `resetTailwindDefaults` mới … được áp dụng mà không cần khởi động lại; chỉnh sửa config không hợp lệ sẽ được báo cáo và **config hợp lệ gần nhất vẫn giữ hiệu lực** cho đến khi file được sửa lại đúng. Một theme không thể đọc khi khởi động (file không tồn tại, là thư mục) hoặc config không hợp lệ khi khởi động sẽ thoát với mã 1 trước khi bất kỳ watcher nào bắt đầu; khi đang watch, lỗi theme hoặc lỗi ghi file sẽ được ghi log và quá trình watch vẫn tiếp tục.

`--check` không ghi gì và thoát với mã 1 khi file tokens thiếu hoặc khác với những gì theme và config sẽ sinh ra (`<path> does not exist. Run: style-gen generate` / `<path> is out of date. Run: style-gen generate`); ngược lại nó thoát với mã 0, kể cả khi `theme.css` không tồn tại, và không thể dùng chung với `--watch` (mã thoát 1). File tokens chỉ chứa key, không chứa giá trị: chỉ sửa một giá trị màu thì file vẫn được coi là còn mới. Hãy chạy nó trong CI để bắt trường hợp commit chỉnh sửa theme mà quên sinh lại `theme.tokens.ts`.

### `style-gen schema`

Ghi JSON Schema của theme (từ `z.toJSONSchema(ThemeSchema)`) và của `style-gen.config.json` để editor có thể tự hoàn thành các key và đánh dấu key lạ khi file khai báo `"$schema"`. Khi không có `--out`, schema của theme được ghi vào `theme.schema.json` cạnh `theme` đã cấu hình (mặc định `styles/theme.json`), nơi `"$schema": "./theme.schema.json"` tìm đến; file config khi đó được đọc tương tự cách `generate` đọc, vì vậy config không hợp lệ schema sẽ thoát với mã 1 và không ghi gì cả. Schema của config được ghi vào `style-gen.config.schema.json` ở thư mục gốc dự án, trừ khi `--config-out` chỉ định file khác; hãy thêm `"$schema": "./style-gen.config.schema.json"` vào `style-gen.config.json` để editor tự hoàn thành.

| Cờ             | Kiểu     | Mặc định                                           | Mô tả                                                 |
| :------------- | :------- | :------------------------------------------------- | :---------------------------------------------------- |
| `--out`        | `string` | `theme.schema.json` cạnh theme                     | File cho JSON Schema của theme; phải nằm trong dự án  |
| `--config-out` | `string` | `style-gen.config.schema.json` ở thư mục gốc dự án | File cho JSON Schema của config; phải nằm trong dự án |

Cả hai đường dẫn được kiểm tra trước khi ghi bất cứ thứ gì (`--config-out escapes project root: <path>`, mã thoát 1). JSON Schema của config không gồm các kiểm tra chéo giữa các giá trị được liệt kê ở mục [File cấu hình](#file-cấu-hình).

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme) and style-gen.config.schema.json
yarn style-gen schema --out styles/theme.schema.json --config-out style-gen.config.schema.json
```

### `style-gen doctor`

Kiểm tra thiết lập: file config (một `style-gen.config.json` hoặc `package.json["style-gen"]` sai định dạng là một lỗi — `generate` cảnh báo và dùng mặc định — và file không hợp lệ schema cũng vậy: các key của config và giá trị tùy chọn được kiểm tra bằng cùng schema như `generate()`, nên cả hai lệnh đều đưa ra cùng kết luận, và `doctor` in ra `Config (<file>) ❌ Invalid` kèm danh sách lỗi; **lỗi config sẽ dừng `doctor` ngay tại đó**, vì mọi bước kiểm tra sau đó đều sẽ chạy trên các mặc định sai), cú pháp JSON, kiểm tra hợp lệ `ThemeSchema` (mỗi vấn đề in ra dạng `path → message`), **cặp theme × options** (`❌ Invalid theme/options`: `resetTailwindDefaults: ["radius"]` mà không có `borderRadius`, …), và file output. Theme nằm ngoài dự án vẫn hợp lệ; `output` đã cấu hình mà vượt ra ngoài thư mục gốc của dự án là một lỗi. Lệnh này cũng in ra các cảnh báo — không bao giờ là lỗi — đối với các key hợp lệ schema nhưng xung đột với utility của Tailwind (ví dụ `none` trong `colors`/`shadows`/`borderRadius`, các key `borderWidth` chỉ gồm số, các key `colors` có class `ring-`/`outline-`/`divide-` là một static của Tailwind (`inset` → `ring-inset`, `solid` → `outline-solid`, `xReverse` → `divide-x-reverse`) hoặc một độ rộng/offset số nguyên (`3` → `ring-3`, `offset2` → `ring-offset-2`), hoặc các key typography như `textSm`, `h1` → `h-1`, `italic`), và một **gợi ý alias** cho mỗi override `themeAxes` có giá trị literal lặp lại giá trị của một base key khác trong cùng nhóm token (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): một alias sẽ tự thay đổi theo primitive khi bảng màu base thay đổi, còn literal lặp lại thì không.

```bash
yarn style-gen doctor
```

### `style-gen tokens`

Ghi các **key** design token của theme (`DesignTokens.Web`: một mảng các camelCase key cho mỗi nhóm token, cộng thêm `opacities` (các bước của `coverage.colors.opacities`, tăng dần; `[]` khi không có tùy chọn), `breakpoints`, `screens` và `spacingProperties`) dưới dạng một module TypeScript, nhờ đó client bundle có thể import danh sách key mà không cần kèm theo runtime `./tokens` hay file theme JSON (khoảng 2.4 kB gzip khi đi chung, so với khoảng 0.6 kB cho các key được sinh ra).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (beside the configured output)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

Module có dạng `export const tokens = {…} as const` cùng `export type Tokens = typeof tokens`, và `export const themeAxes = {…} as const` (mỗi trục kèm tên các variant, đúng là các key gốc của theme) cùng `export type ThemeAxesState`; nó được dựng bằng chính mã nguồn của `createDesignTokens()`, với `breakpoints`/`screens`/`spacing` từ config, vì vậy cả hai không thể lệch nhau. Theme và các tùy chọn được kiểm tra hợp lệ tương tự trong `generate`; output mặc định là `tokensOutput` trong config, nếu không có thì `theme.tokens.ts` cạnh `output`, và phải ở bên trong dự án. `generate` và các plugin bundler ghi cùng file này cùng với CSS; hãy chạy `tokens` để ghi riêng nó hoặc dùng `--out`.

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
  "resetTailwindDefaults": ["colors"]
}
```

`breakpoints`, `screens`, `enableResponsive`, `spacing`, `typography`, `coverage` và `resetTailwindDefaults` được chuyển tiếp đến `generate()`.
Bất kỳ key nào khác — một lỗi gõ nhầm như `breakpoint`, hoặc key mà một bản major trước đã gỡ (`plugin`, `extraSources`, `axes`) — đều bị từ chối;
chỉ `$schema`, `theme`, `output` và `tokensOutput` được chấp nhận ngoài các key chuyển tiếp.
`$schema` là con trỏ để editor tìm đến JSON Schema của config, không phải một thiết lập: hãy thêm `"$schema": "./style-gen.config.schema.json"` làm key đầu tiên (`style-gen schema` và `init` ghi file đó) thì editor sẽ gợi ý key và đánh dấu key lạ; key này được chấp nhận trong file, bị bỏ khi đọc và không bao giờ đến `generate()`.
JSON Schema chỉ mô tả key và hình dạng giá trị. Nó không mang các kiểm tra so sánh giá trị với nhau (một entry của `breakpoints` phải trỏ tới một screen, `screens` phải dùng cùng một đơn vị sau khi gộp với mặc định, `coverage.<category>.prefixes` phải là tiền tố thật của nhóm đó), nên editor có thể chấp nhận một config mà `generate` và `doctor` từ chối.
`tokensOutput` là đường dẫn của module tokens được sinh ra, tương đối so với thư mục gốc dự án và nằm bên trong đó (mặc định: `theme.tokens.ts` cạnh `output`); nó phải là file `.ts`, `.mts` hoặc `.cts`, không phải `.d.ts`.
Một config vẫn còn `plugin`, `extraSources` hoặc `axes` bị từ chối như mọi key lạ khác (`<key> → Unrecognized key`): hãy tự xóa key đó. `style-gen init` gộp vào file như đang có và không bỏ hay báo key đó. Hãy khai báo các class tạo lúc runtime bằng `@source inline(...)` của riêng bạn cạnh dòng import file được sinh.
`styleGenVite()` và `styleGenNext()` khi gọi **không có đối số** sẽ đọc chính file này (xem [Vite](./vite.md) / [Next](./next.md)). CLI phân giải cấu hình theo thứ tự sau, cho từng key:

1. các cờ của lệnh
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. các giá trị mặc định tích hợp sẵn

Hai nguồn file là các lựa chọn thay thế cho nhau, không phải xếp lớp chồng lên nhau: CLI đọc `style-gen.config.json` khi nó tồn tại và chỉ đọc `package.json["style-gen"]` khi file trên không tồn tại, và không bao giờ merge cả hai (một file `style-gen.config.json` sai định dạng sẽ được báo cáo, chứ không bị thay thế bởi phần cấu hình trong `package.json`). Các cờ sẽ override từng key đơn lẻ của bất kỳ file nào đã được đọc, và các giá trị mặc định sẽ điền vào các key chưa được thiết lập.
