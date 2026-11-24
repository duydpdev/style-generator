<!-- source: documents/reference/cli.md sha256: 2bce7f89adcf -->

# CLI

Công cụ dòng lệnh `style-gen`: `init`, `generate`, `schema`, `doctor`, `tokens` và `budget`.

> **Cảnh báo:** Hãy cài đặt package trước và luôn chạy CLI thông qua trình quản lý package của bạn (`yarn style-gen …`). Đừng bao giờ chạy qua `npx`: cái tên `style-gen` chưa được đăng ký trên npm registry công khai, vì vậy `npx` có thể tải về một package không liên quan. Với npm, hãy dùng `npm exec --no -- style-gen` để nó chỉ phân giải bản cài đặt cục bộ của bạn.

Các lệnh mà CLI in trong gợi ý (`Run: … style-gen init`, `💡 Fix it first: … style-gen doctor`) theo trình quản lý package của dự án: trình đã khởi chạy lệnh (`npm_config_user_agent`), nếu không có thì theo lockfile gần nhất tính lên tới thư mục chứa `.git`, nếu vẫn không có thì là npm. Chúng có dạng `yarn style-gen`, `pnpm exec style-gen`, `bun run style-gen` hoặc `npm exec --no -- style-gen`.

## Lệnh

### `style-gen init`

Tạo sẵn file theme JSON, JSON Schema của nó, `style-gen.config.json` và JSON Schema của config, sau đó in ra cách nối dây chúng vào stack của bạn. `init` không bao giờ tự sửa file cấu hình của bundler.

Trình hướng dẫn sẽ hỏi vị trí file theme và có muốn kèm theo template dark mode hay không. Khi không có terminal, hoặc để bỏ qua trình hướng dẫn: `yarn style-gen init --dark`, `--theme` hoặc `--yes`.
Lệnh sẽ ghi theme, file `theme.schema.json` của nó (cho trường `"$schema"` của theme), `style-gen.config.json` và `style-gen.config.schema.json` (cho trường `"$schema"` của config). `init` thêm `$schema` đó làm key đầu tiên của config mà nó ghi hoặc hợp nhất vào, không bao giờ thêm vào config mà nó giữ nguyên.
Một config hợp lệ đã nêu đúng theme mà `init` làm việc được giữ nguyên, kể cả `output` (`package.json#style-gen` cũng là một config như vậy: không có `style-gen.config.json` nào được tạo bên cạnh nó). Ngược lại (chọn theme khác trong trình hướng dẫn hoặc bằng `--theme`), `init` hợp nhất `theme` và `$schema` vào config hiện có, chỉ thêm `output` khi config chưa có, và giữ nguyên các key khác như đang có, kể cả `$schema` và `output` tùy chỉnh mà nó đã có; một mục `package.json#style-gen` khi đó được chép vào một `style-gen.config.json` mới.
Nếu theme hoặc một trong hai file schema đã tồn tại, nó sẽ hỏi trước khi ghi đè (không tương tác: `Files already exist. Run interactively to confirm overwrite.` và mã thoát 1; với `--yes`: giữ nguyên các file và thoát với mã 0). Từ chối prompt thì giữ các file đã có và vẫn ghi những gì còn thiếu, kể cả config, nên `generate` chạy được sau đó (`Existing files kept; writing only what is missing.`). Một config đã có không bao giờ bị ghi lại khi dùng `--yes`: xem [`init --yes`](#init---yes).

Một config mà `generate` từ chối (config 7.x vẫn còn `extraSources`, chẳng hạn) vẫn khai báo `theme` và `output` của nó, và `init` giữ chúng thay vì chuyển dự án sang mặc định của stack: trình hướng dẫn đề xuất theme đã khai báo, một lần chạy không có trình hướng dẫn làm việc trên nó (theme chưa tồn tại sẽ được tạo ở đường dẫn đó, và config giữ nguyên từng byte), và `--rules-only` in ra `output` đã khai báo. Config không có key `theme` nghĩa là `styles/theme.json`, như `generate` đọc. Khi `init` để nguyên một config như vậy, nó nói rõ: `<file> is invalid and init left it as it is; generate rejects it:`, các vấn đề và `💡 Fix it: … style-gen doctor`. Khi `--theme` hoặc trình hướng dẫn chọn một theme khác, `init` chỉ gộp `theme` đó vào, giữ mọi key khác, và cảnh báo `style-gen.config.json is invalid and init only merged the theme into it; generate rejects it:`. Từ chối prompt ghi đè trên một config không hợp lệ thì không ghi gì ngoài rules cho agent. Không có terminal, config khai báo một theme đã tồn tại thoát với mã 1 và `Files already exist`, giống như config hợp lệ.

Khi key `theme` có mặt nhưng không phải chuỗi không rỗng, hoặc mục `package.json#style-gen` không phải một object JSON, theme đã khai báo không đọc được. Không có terminal và không có `--theme`, `init` thoát với mã 1 và `<file> is invalid and its "theme" cannot be read:`, các vấn đề và `💡 Fix it first: … style-gen doctor, or pass --theme <path>`; `--theme` hoặc một câu trả lời trong trình hướng dẫn sẽ chỉ định theme. Một `style-gen.config.json` không phải JSON hợp lệ làm `init` dừng với mã 1 trước khi ghi bất cứ thứ gì, kể cả khi dùng `--yes`: `<file> is not valid JSON (<parser message>).` và `💡 Fix it, or delete it and run init again.`

`init` từ chối một đường dẫn theme trùng với file mà nó ghi hoặc hợp nhất vào: một trong hai file schema, `style-gen.config.json` hoặc `package.json`, dù đường dẫn được viết thế nào (chữ hoa/thường khác trên volume không phân biệt hoa/thường, symlink, tiền tố `./`). Nó thoát với mã 1 và `init writes or merges into <path>: the theme would overwrite it.` cùng `💡 Pass another --theme <path>`, và không ghi gì.

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

Mã thoát: `0` thành công, giữ nguyên file đã có (`--yes`) hoặc hủy prompt; `1` thất bại, gồm cả trường hợp file đã có mà không có terminal và không có `--yes` (cũng khi config khai báo một theme đã tồn tại), config không phải JSON hợp lệ, config không hợp lệ mà theme của nó không đọc được, đường dẫn theme mà `init` sẽ ghi đè, và hai trường hợp dưới `--yes` bên dưới.

#### `init --yes`

`--yes` không bao giờ mở trình hướng dẫn hay đặt câu hỏi, kể cả trong terminal: nó dùng `--theme` và `--dark` khi có, và các mặc định của stack khi không. Khi theme hoặc một trong hai file schema đã tồn tại, nó giữ nguyên tất cả, in `Existing files kept (--yes never overwrites).`, vẫn làm mới rules cho agent (file rules đã sửa được giữ lại, như mọi lần chạy không tương tác) và thoát với mã 0, trong khi một lần chạy không có terminal và không có `--yes` thoát với mã 1.

Một `style-gen.config.json` (hoặc `package.json#style-gen`) đã có được giữ nguyên, và theme mà nó nêu là theme mà `init` làm việc với; chỉ các file còn thiếu mới được ghi. Hai trường hợp dừng với mã thoát 1 thay vì đoán:

- config không hợp lệ (kể cả các key đã bị gỡ ở một major trước, như `extraSources`, `axes` và `plugin`): `<file> is invalid, so --yes cannot tell where its theme lives:`, các vấn đề và `💡 Fix it first: … style-gen doctor`. Hãy xoá các key đó, hoặc chỉ làm mới các quy tắc bằng `style-gen init --rules-only`;
- `--theme` nêu một theme khác với config: `--theme <path> differs from the theme of <file> (<path>); --yes never redirects an existing config.` và `💡 Drop --theme, or run init without --yes to change it`.

Khi theme của config nằm ngoài thư mục gốc dự án (một theme dùng chung), `init` in `The theme of <file> (<path>) is outside the project root: init writes no theme or theme schema for it.`, ghi schema của config cùng các quy tắc, và thoát với mã 0.

Mặc định của `--theme` trở thành `src/styles/theme.json` khi có thư mục `src/`, và `app/assets/css/theme.json` (`assets/css/theme.json` nếu không có `app/`) khi tìm thấy `nuxt.config.*`. Ngoại lệ là một dự án chưa có config mà đã có theme ở `styles/theme.json`, nơi `generate` đọc khi không có config: theme đó vẫn là mặc định (trình hướng dẫn đề xuất nó, `--yes` dùng nó), nên `init` không bao giờ tạo theme thứ hai bên cạnh. CSS được ghi ngay cạnh theme (`theme.css`).

#### Rules cho agent

`init` ghi `.claude/rules/style-generator.md`, tức [hợp đồng cho agent](../agent-contract.md) của phiên bản đang cài (dòng đầu ghi phiên bản). Các coding agent đọc `.claude/rules/` sẽ tuân theo nó khi viết theme và component. File này chứa các class literal làm ví dụ, và Tailwind quét cả thư mục ẩn, nên các dòng CSS được in ra kết thúc bằng `@source not "<path>/.claude";`.

| File rules trong dự án                                                      | `init` làm gì                                                                |
| :-------------------------------------------------------------------------- | :--------------------------------------------------------------------------- |
| chưa có                                                                     | ghi file (`Created .claude/rules/style-generator.md`)                        |
| giống hệt bản của phiên bản này                                             | giữ nguyên (`Rules up to date: …`)                                           |
| ghi phiên bản khác                                                          | thay luôn, kể cả khi không tương tác (`Updated … (7.0.0 → 7.1.0)`)           |
| cùng phiên bản nhưng đã sửa, hoặc không có dòng phiên bản, chế độ tương tác | hỏi trước khi thay; từ chối hoặc huỷ prompt thì giữ file                     |
| cùng phiên bản nhưng đã sửa, hoặc không có dòng phiên bản, không tương tác  | giữ file và nhắc chạy `style-gen init --rules-only` trong terminal tương tác |

Sau khi nâng cấp, chạy `style-gen init --rules-only` để làm mới file: lệnh này không đụng tới theme, schema hay `style-gen.config.json`, không mở trình hướng dẫn, in các dòng CSS kèm `@source not` và thoát với mã 0. Đường dẫn CSS là `output` của config (kể cả `package.json#style-gen`, và cả khi config không hợp lệ) và `styles/theme.css` khi config không nêu. Khi chưa có config (không có `style-gen.config.json`, không có `package.json#style-gen`) thì không có CSS sinh ra để trỏ tới: lệnh không in dòng CSS nào, báo `No style-gen.config.json in this directory` và chỉ sang `style-gen init`, lệnh sẽ in chúng. Nó không đi cùng `--theme`, `--dark` hay `--skip-rules` (mã 1). Một lần `init` thường mà giữ theme hiện có ở prompt ghi đè cũng cập nhật rules và in lại các bước tiếp theo. `--skip-rules` không ghi file rules. Một bản build thiếu rules (một lần `yarn build` cục bộ bỏ qua bước emit) sẽ in cảnh báo và thoát với mã 0.

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

| Cờ              | Kiểu      | Mặc định                                                | Mô tả                                                                                                  |
| :-------------- | :-------- | :------------------------------------------------------ | :----------------------------------------------------------------------------------------------------- |
| `--theme`       | `string`  | `theme` trong config, nếu không thì `styles/theme.json` | Đường dẫn đến file theme JSON                                                                          |
| `--out`         | `string`  | `output` trong config, nếu không thì `styles/theme.css` | Đường dẫn đến file CSS đầu ra                                                                          |
| `-w`, `--watch` | `boolean` | `false`                                                 | Chế độ watch — tự động sinh lại mỗi khi lưu                                                            |
| `--check`       | `boolean` | `false`                                                 | Không ghi gì; thoát với mã 1 khi `theme.tokens.ts` thiếu hoặc khác với kết quả sinh từ theme và config |

Mã thoát: `0` thành công (cả với `--help`), `1` thất bại (theme, tùy chọn hoặc config không hợp lệ, lỗi ghi file, `--check` thấy file tokens thiếu hoặc khác).

Dạng truyền vị trí `style-gen generate <theme> <out>` cũng hoạt động; các cờ được ưu tiên hơn. File được ghi một cách nguyên tử và **chỉ khi nội dung của nó có sự thay đổi** (chạy lại trên một theme chưa đổi sẽ không chạm vào file, giúp các file watcher không bị kích hoạt). `--theme` có thể trỏ ra ngoài dự án (một package design-system dùng chung); `--out` và `output` trong config phải nằm bên trong dự án (`output escapes project root: <path>`). File tokens được ghi vào `tokensOutput` trong config, nếu không thì `theme.tokens.ts` cạnh CSS; nó phải là file `.ts`, `.mts` hoặc `.cts` (`tokensOutput must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got <path>`), và theme, CSS cùng module tokens phải là các file khác nhau, không cái nào là `style-gen.config.json` hay `package.json` (`<a> and <b> must be different files, both resolve to <path>`; một file được tới qua chữ hoa/thường khác, symlink hoặc hard link được tính là một file: xem [must be different files](../troubleshooting.md#must-be-different-files)). Một theme không hợp lệ (`Invalid theme (<path>):`), tùy chọn không hợp lệ (`Invalid options:`) hoặc cặp theme × options không hợp lệ (`Invalid theme/options:`), file config không hợp lệ (`Invalid config (<file>):` theo sau là từng dòng `path → message` cho mỗi lỗi, ví dụ `breakpoint` do gõ nhầm) hoặc lỗi ghi file sẽ giữ nguyên file output và thoát với mã 1. File config sai định dạng (không phải JSON) sẽ bị cảnh báo (`Ignoring <file> is not valid JSON (<reason>); using defaults`) và các giá trị mặc định sẽ được dùng, trừ khi có `--check`. Khi không có config nào cả, `generate` nói rõ điều đó (`No style-gen.config.json or package.json#style-gen found in <directory>; using the defaults.`) trước khi gợi ý `init` cho một theme bị thiếu. Xem [Khắc phục sự cố](../troubleshooting.md) cho từng thông báo.

`--watch` sẽ chạy lại mỗi khi có thay đổi trong theme **và trong file config**. Cả hai ứng viên đều được theo dõi, `style-gen.config.json` và `package.json#style-gen`, nên việc tạo cái đầu tiên hoặc chuyển config giữa hai file được nhận ra; khi `style-gen.config.json` tồn tại, các sự kiện của `package.json` bị bỏ qua. Một file config hoặc theme bị xóa rồi tạo lại (`git checkout`, `git stash`) được theo dõi lại: việc tạo lại và các chỉnh sửa sau đó chạy lại emit, kể cả khi nó quay lại chỉ sau vài mili giây. Config được đọc lại sau mỗi lần thay đổi, nhờ đó `output`, `breakpoints`, `resetTailwindDefaults` mới … được áp dụng mà không cần khởi động lại; chỉnh sửa config không hợp lệ sẽ được báo cáo (`Invalid config (<file>):` hoặc `Cannot reload config: <reason>`) và **config hợp lệ gần nhất vẫn giữ hiệu lực** cho đến khi file được sửa lại đúng. Một theme không thể đọc khi khởi động (file không tồn tại, là thư mục) hoặc config không hợp lệ khi khởi động sẽ thoát với mã 1 trước khi bất kỳ watcher nào bắt đầu; khi đang watch, lỗi theme hoặc lỗi ghi file sẽ được ghi log và quá trình watch vẫn tiếp tục.

`--check` không ghi gì và thoát với mã 1 khi file tokens thiếu hoặc khác với những gì theme và config sẽ sinh ra (`<path> does not exist. Run: style-gen generate` / `<path> is out of date. Run: style-gen generate`); ngược lại nó thoát với mã 0, kể cả khi `theme.css` không tồn tại, và không thể dùng chung với `--watch` (mã thoát 1). File tokens chỉ chứa key, không chứa giá trị: chỉ sửa một giá trị màu thì file vẫn được coi là còn mới. Kết thúc dòng không được so sánh (CRLF bằng LF). Một config không phải JSON hợp lệ làm phép kiểm tra thất bại (`--check needs a readable config: <reason>`, mã thoát 1) thay vì quay về giá trị mặc định, vì kiểm tra theo những mặc định mà không ai cấu hình sẽ xác nhận nhầm file. Hãy chạy nó trong CI để bắt trường hợp commit chỉnh sửa theme mà quên sinh lại `theme.tokens.ts`.

### `style-gen schema`

Ghi JSON Schema của theme (từ `z.toJSONSchema(ThemeSchema)`) và của `style-gen.config.json` để editor có thể tự hoàn thành các key và đánh dấu key lạ khi file khai báo `"$schema"`. Khi không có `--out`, schema của theme được ghi vào `theme.schema.json` cạnh `theme` đã cấu hình (mặc định `styles/theme.json`), nơi `"$schema": "./theme.schema.json"` tìm đến; file config khi đó được đọc tương tự cách `generate` đọc. Schema của config được ghi vào `style-gen.config.schema.json` ở thư mục gốc dự án, trừ khi `--config-out` chỉ định file khác, và nó được ghi trên mọi nhánh thành công, kể cả khi config có vấn đề: một config không hợp lệ schema chính là lúc người nâng cấp cần nó. Khi không có `--out`, `schema` sau đó báo các vấn đề (`Invalid config (<file>):`), không ghi schema của theme (config quyết định nơi nó sẽ nằm) và thoát với mã 1. Một `style-gen.config.json` hợp lệ chưa có `"$schema"` được thêm đúng một dòng `"$schema"` (đường dẫn của schema config, tương đối và bắt đầu bằng `./`) ngay sau dấu `{` mở đầu, và không có gì khác trong file thay đổi (kiểu xuống dòng và thụt lề được giữ; file được ghi tại chỗ, kể cả qua symlink); `Added "$schema" to style-gen.config.json` báo điều đó. Một file không hợp lệ hoặc sai cú pháp được giữ nguyên và `schema` in dòng cần thêm, dù có hay không có `--out`; `"$schema"` mà file đã có và `package.json#style-gen` không bao giờ bị sửa. Với `--out`, config chỉ được tham khảo để lấy file theme mà nó không được ghi đè, và các vấn đề của config không được báo cáo: cả hai schema được ghi và mã thoát là 0. Config không phải JSON hợp lệ bị cảnh báo (`Ignoring <file> is not valid JSON (<reason>); using defaults`), dù có hay không có `--out`, và được đọc như mặc định.

| Cờ             | Kiểu     | Mặc định                                           | Mô tả                                                 |
| :------------- | :------- | :------------------------------------------------- | :---------------------------------------------------- |
| `--out`        | `string` | `theme.schema.json` cạnh theme                     | File cho JSON Schema của theme; phải nằm trong dự án  |
| `--config-out` | `string` | `style-gen.config.schema.json` ở thư mục gốc dự án | File cho JSON Schema của config; phải nằm trong dự án |

Mã thoát: `0` thành công (cũng cho config có vấn đề khi có `--out`), `1` thất bại (khi không có `--out`, cũng cho config có vấn đề).

Cả hai đường dẫn được kiểm tra trước khi ghi bất cứ thứ gì (`--config-out escapes project root: <path>`, mã thoát 1). `schema` không bao giờ ghi đè theme hay config (thay đổi duy nhất của nó với config là một dòng `"$schema"` ở trên). Nó bảo vệ theme (`theme` của config hợp lệ, nếu không thì theme mà config không hợp lệ khai báo, nếu không thì `styles/theme.json`), `style-gen.config.json` và `package.json` (cả hai, dù có tồn tại hay không), và hai đích schema phải khác nhau. Một đích trùng với một trong số đó thoát với mã 1 và không ghi gì, với `--config-out` cũng như `--out`: `--out and --config-out name the same file: <path>`, `--out would overwrite the theme file: <path>`, `--config-out would overwrite the theme file: <path>`, `--out would overwrite the config file: <path>` và `--config-out would overwrite the config file: <path>`. Một file được tới qua chữ hoa/thường khác hoặc symlink được tính là một file ([must be different files](../troubleshooting.md#must-be-different-files)). JSON Schema của config mang các quy tắc key và giá trị mà bộ sinh của nó ánh xạ vào, không gồm các kiểm tra chéo giữa các giá trị được liệt kê ở mục [File cấu hình](#file-cấu-hình) ([Giới hạn của JSON Schema](./options.md#giới-hạn-của-json-schema)). Hãy chạy `style-gen schema` sau khi nâng cấp package: cả `generate` lẫn `init` đều không ghi lại schema đã commit, nên nó giữ các key của phiên bản đã ghi ra nó.

```bash
yarn style-gen schema                            # → styles/theme.schema.json (next to the theme) and style-gen.config.schema.json
yarn style-gen schema --out styles/theme.schema.json --config-out style-gen.config.schema.json
```

### `style-gen doctor`

Kiểm tra thiết lập: file config (một `style-gen.config.json` hoặc `package.json["style-gen"]` sai định dạng là một lỗi — `generate` cảnh báo và dùng mặc định — và file không hợp lệ schema cũng vậy: các key của config và giá trị tùy chọn được kiểm tra bằng cùng schema như `generate()`, nên cả hai lệnh đều đưa ra cùng kết luận. `doctor` in ra `Config (<file>) ❌ Ignored` cho file sai định dạng và `Config (<file>) ❌ Invalid` kèm danh sách lỗi cho file không hợp lệ schema; **lỗi config sẽ dừng `doctor` ngay tại đó**, vì mọi bước kiểm tra sau đó đều sẽ chạy trên các mặc định sai), cú pháp JSON, kiểm tra hợp lệ `ThemeSchema` (mỗi vấn đề in ra dạng `path → message`), **cặp theme × options** (`❌ Invalid theme/options`: `resetTailwindDefaults: ["radius"]` mà không có `borderRadius`, …), các đường dẫn đầu ra (`Output (<output>) ❌ Invalid emit paths` kèm thông báo mà `generate` sẽ dừng lại với nó: `output` hoặc `tokensOutput` nằm ngoài thư mục gốc dự án, một `tokensOutput` không phải file `.ts`, `.mts` hay `.cts`, hai trong số theme, output và module tokens dùng chung một file, hoặc một trong số chúng là `style-gen.config.json` hay `package.json`), và file output. Theme nằm ngoài dự án vẫn hợp lệ. Lệnh này cũng in ra các cảnh báo — không bao giờ là lỗi — đối với các key hợp lệ schema nhưng xung đột với utility của Tailwind (ví dụ `none` trong `colors`/`shadows`/`borderRadius`, các key `borderWidth` chỉ gồm số, các key `colors` có class `ring-`/`outline-`/`divide-` là một static của Tailwind (`inset` → `ring-inset`, `solid` → `outline-solid`, `xReverse` → `divide-x-reverse`) hoặc một độ rộng/offset số nguyên (`3` → `ring-3`, `offset2` → `ring-offset-2`), hoặc các key typography như `textSm`, `h1` → `h-1`, `italic`), và một **gợi ý alias** cho mỗi override `themeAxes` có giá trị literal lặp lại giá trị của một base key khác trong cùng nhóm token (`Override theme.dark.colors.surface repeats base value #fff → use alias "$white"`): một alias sẽ tự thay đổi theo primitive khi bảng màu base thay đổi, còn literal lặp lại thì không.

```bash
yarn style-gen doctor
```

Mã thoát: `0` thành công, `1` khi có bất kỳ lỗi nào (cảnh báo vẫn giữ `0`). `doctor` không nhận cờ nào.

### `style-gen tokens`

Ghi các **key** design token của theme (`DesignTokens.Web`: một mảng các camelCase key cho mỗi nhóm token, cộng thêm `opacities` (các bước của `coverage.colors.opacities`, tăng dần; `[]` khi không có tùy chọn), `breakpoints`, `screens` và `spacingProperties`) dưới dạng một module TypeScript, nhờ đó client bundle có thể import danh sách key mà không cần kèm theo runtime `./tokens` hay file theme JSON (khoảng 2.4 kB gzip khi đi chung, so với khoảng 0.6 kB cho các key được sinh ra).

```bash
yarn style-gen tokens                                  # → styles/theme.tokens.ts (beside the configured output)
yarn style-gen tokens --theme styles/theme.json --out src/theme.tokens.ts
```

| Cờ        | Kiểu     | Mặc định                                                                     | Mô tả                                                                              |
| :-------- | :------- | :--------------------------------------------------------------------------- | :--------------------------------------------------------------------------------- |
| `--theme` | `string` | `theme` trong `style-gen.config.json`, nếu không thì `styles/theme.json`     | Đường dẫn đến file theme JSON                                                      |
| `--out`   | `string` | `tokensOutput` trong config, nếu không thì `theme.tokens.ts` cạnh CSS đầu ra | File cần ghi (`.ts`, `.mts` hoặc `.cts`, không phải `.d.ts`); phải nằm trong dự án |

Mã thoát: `0` thành công, `1` thất bại.

<!-- snippet: no-check imports the module `style-gen tokens` generates -->

```ts
import { tokens } from "./theme.tokens";
type ColorKey = (typeof tokens.colors)[number];
```

Module có dạng `export const tokens = {…} as const` cùng `export type Tokens = typeof tokens`, và `export const themeAxes = {…} as const` (mỗi trục kèm tên các variant, đúng là các key gốc của theme) cùng `export type ThemeAxesState`; nó được dựng bằng chính mã nguồn của `createDesignTokens()`, với `breakpoints`/`screens`/`spacing` từ config, vì vậy cả hai không thể lệch nhau. Theme và các tùy chọn được kiểm tra hợp lệ tương tự trong `generate`; output mặc định là `tokensOutput` trong config, nếu không có thì `theme.tokens.ts` cạnh `output`, và phải ở bên trong dự án. `generate` và các plugin bundler ghi cùng file này cùng với CSS; hãy chạy `tokens` để ghi riêng nó hoặc dùng `--out`.

### `style-gen budget`

Làm thất bại CI khi CSS sau khi build vượt quá ngân sách dung lượng gzip: lệnh tính tổng dung lượng gzip (mặc định của `node:zlib`) của một file `.css`, hoặc của mọi file `.css` trong một thư mục (duyệt đệ quy, ví dụ `.next/static/css` hoặc `dist/assets`). Với `--coverage-cost` nó còn liệt kê những nhóm class của theme tốn dung lượng nhất.

```bash
yarn style-gen budget .next/static/css --max-gzip 14925 --coverage-cost
```

| Cờ                   | Kiểu      | Mặc định | Mô tả                                                                                                          |
| :------------------- | :-------- | :------- | :------------------------------------------------------------------------------------------------------------- |
| `--max-gzip <bytes>` | `number`  | bắt buộc | Ngân sách tính bằng byte; lệnh thoát với mã 1 khi tổng dung lượng gzip lớn hơn mức này                         |
| `--coverage-cost`    | `boolean` | tắt      | Sau dòng tóm tắt, liệt kê các nhóm class của theme theo dung lượng gzip, kèm thiết lập `coverage` loại bỏ nhóm |
| `--theme <path>`     | `string`  | config   | Theme cho `--coverage-cost`; mặc định: theme trong config. Dùng mà không có `--coverage-cost` là lỗi cách dùng |

Khi thành công nó in ra dòng tóm tắt `OK: …`; khi vượt ngân sách nó in `OVER BUDGET: …` và thoát với mã 1. Các mã thoát: `0` trong ngân sách, `1` vượt ngân sách, `2` lỗi cách dùng, target không đọc được hoặc không tìm thấy CSS, hoặc (với `--coverage-cost`) config hay theme không đọc được.

`--coverage-cost` in dòng tóm tắt trước và giữ nguyên, rồi tối đa mười dòng, lớn nhất trước:

```text
Coverage cost (upper bound):
  colors/divide           1062 B gzip  (120 rules)  coverage.colors.prefixes: ["bg","text","border","ring","outline","placeholder"]
```

Mỗi dòng là một nhóm (`<category>/<class prefix>`): số byte gzip tiết kiệm được khi bỏ các rule của nó khỏi CSS, số rule, và thiết lập `coverage` khiến `@source inline` không sinh nhóm đó nữa. Con số là cận trên: các class mà source của bạn đang dùng vẫn nằm trong CSS sau khi cắt. Khi một group trong `coverage.colors.opacities` tự liệt kê tiền tố đó trong `prefixes` của nó, thiết lập kết thúc bằng `(opacity group <i> still adds it)`, với `<i>` là chỉ số bắt đầu từ 0 của group trong `opacities` (các bước thường cũng được đếm): chỉ thu hẹp `prefixes` của rule thì chưa bỏ được các class của group đó. Các dòng chi phí chỉ mang tính thông tin, không phải hợp đồng; chỉ dòng tóm tắt là hợp đồng.

### `style-gen --version`

In ra phiên bản CLI đã cài đặt.

### Trợ giúp và mã thoát

`style-gen --help` liệt kê các lệnh; `style-gen <command> --help` in ra các tùy chọn của lệnh đó. Các cờ được phân tích nghiêm ngặt: **cờ lạ là một lỗi** (`--them` bị từ chối thay vì âm thầm dùng theme mặc định), và lệnh lạ cũng vậy. Mọi lệnh đều thoát với mã `0` khi thành công, khi gọi `--help`, `--version` hoặc khi hủy prompt, và thoát với mã `1` khi thất bại (`budget` dùng `2` cho lỗi sử dụng, xem ở trên).

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
Bất kỳ key nào khác (một lỗi gõ nhầm như `breakpoint`) đều bị từ chối kèm tên key; `style-gen schema` ghi JSON Schema của file này.
Chỉ `$schema`, `theme`, `output` và `tokensOutput` được chấp nhận ngoài các key chuyển tiếp.
`$schema` là con trỏ để editor tìm đến JSON Schema của config, không phải một thiết lập: hãy thêm `"$schema": "./style-gen.config.schema.json"` làm key đầu tiên (`init` ghi nó vào config mà nó tạo, còn `style-gen schema` chèn nó vào một `style-gen.config.json` hợp lệ chưa có) thì editor sẽ gợi ý key và đánh dấu key lạ; key này được chấp nhận trong file, bị bỏ khi đọc và không bao giờ đến `generate()`.
JSON Schema nêu các quy tắc key và giá trị, và, với mỗi nhóm `coverage`, `prefixes`, `keys` và `opacities` khác nhau của riêng nhóm đó. Nó không mang các kiểm tra so sánh giá trị với nhau hay đọc file khác, cũng không mang các quy tắc đường dẫn, nên editor có thể chấp nhận một config mà `generate` và `doctor` từ chối: xem [Giới hạn của JSON Schema](./options.md#giới-hạn-của-json-schema).
`tokensOutput` là đường dẫn của module tokens được sinh ra, tương đối so với thư mục gốc dự án và nằm bên trong đó (mặc định: `theme.tokens.ts` cạnh `output`); nó phải là file `.ts`, `.mts` hoặc `.cts`, không phải `.d.ts`.
Các class tạo lúc runtime được khai báo bằng `@source inline(...)` của riêng bạn cạnh dòng import file được sinh (xem [Tùy chọn](./options.md#class-được-tạo-lúc-runtime)).
`styleGenVite()` và `styleGenNext()` khi gọi **không có đối số** sẽ đọc chính file này (xem [Vite](./vite.md) / [Next](./next.md)). CLI phân giải cấu hình theo thứ tự sau, cho từng key:

1. các cờ của lệnh
2. `style-gen.config.json`
3. `package.json["style-gen"]`
4. các giá trị mặc định tích hợp sẵn

Hai nguồn file là các lựa chọn thay thế cho nhau, không phải xếp lớp chồng lên nhau: CLI đọc `style-gen.config.json` khi nó tồn tại và chỉ đọc `package.json["style-gen"]` khi file trên không tồn tại, và không bao giờ merge cả hai (một file `style-gen.config.json` sai định dạng sẽ được báo cáo, chứ không bị thay thế bởi phần cấu hình trong `package.json`). Các cờ sẽ override từng key đơn lẻ của bất kỳ file nào đã được đọc, và các giá trị mặc định sẽ điền vào các key chưa được thiết lập.
