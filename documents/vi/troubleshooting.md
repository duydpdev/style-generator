<!-- source: documents/troubleshooting.md sha256: 15c6d139b9d5 -->

# Khắc phục sự cố

Tìm phần đầu của thông báo mà CLI, `styleGenVite()` hoặc `styleGenNext()` đã in, rồi đọc mục có cùng tiêu đề. Các plugin bundler thêm tiền tố `[style-gen-vite]` hoặc `[style-gen-next]` vào mọi thông báo; phần văn bản sau tiền tố giống với của CLI. Các thông báo kiểm tra hợp lệ liệt kê một dòng `path → message` cho mỗi vấn đề. `yarn style-gen doctor` ([CLI](./reference/cli.md#style-gen-doctor)) kiểm tra config, theme và CSS đã sinh chỉ trong một lần chạy.

| Thông báo bắt đầu bằng                                          | Đọc                                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `Invalid theme (`                                               | [Invalid theme](#invalid-theme-)                                                          |
| `Invalid options`                                               | [Invalid options](#invalid-options)                                                       |
| `Invalid theme/options`                                         | [Invalid theme/options](#invalid-themeoptions)                                            |
| `Invalid config (`                                              | [Invalid config](#invalid-config-)                                                        |
| `Ignoring … ; using defaults`                                   | [Config hỏng bị bỏ qua](#config-hỏng-bị-bỏ-qua)                                           |
| `--check needs a readable config`                               | [--check needs a readable config](#--check-needs-a-readable-config)                       |
| `… → Unrecognized key`                                          | [Unrecognized key](#unrecognized-key)                                                     |
| `Invalid JSON in`, `Theme file not found`                       | [Invalid JSON và theme không tồn tại](#invalid-json-in-và-theme-file-not-found)           |
| `No style-gen.config.json or package.json#style-gen found`      | [Không tìm thấy config](#không-tìm-thấy-config)                                           |
| `… escapes project root`                                        | [escapes project root](#escapes-project-root)                                             |
| `… must be a .ts, .mts or .cts file`                            | [must be a .ts, .mts or .cts file](#must-be-a-ts-mts-or-cts-file)                         |
| `… must be different files`, `Output (…) ❌ Invalid emit paths` | [must be different files](#must-be-different-files)                                       |
| `Cannot write`                                                  | [Cannot write](#cannot-write)                                                             |
| `Cannot read`                                                   | [Cannot read](#cannot-read)                                                               |
| `… does not exist. Run: style-gen generate`, `… is out of date` | [File tokens bị thiếu hoặc lỗi thời](#file-tokens-bị-thiếu-hoặc-lỗi-thời)                 |
| `Cannot reload config`, `Re-emit failed`                        | [Cannot reload config và Re-emit failed](#cannot-reload-config-và-re-emit-failed)         |
| `Only { root } is accepted`                                     | [Only { root } is accepted](#only--root--is-accepted)                                     |
| `--check and --watch cannot be combined`                        | [--check and --watch cannot be combined](#--check-and---watch-cannot-be-combined)         |
| `… is invalid, so --yes cannot tell`, `--theme … differs from`  | [init dừng với mã thoát 1](#init-dừng-với-mã-thoát-1)                                     |
| `--out and --config-out`, `… would overwrite the theme file`    | [schema từ chối hai file cùng một đường dẫn](#schema-từ-chối-hai-file-cùng-một-đường-dẫn) |

## Invalid theme (

`Invalid theme (src/theme/theme.json):` được theo sau bởi một dòng cho mỗi vấn đề, ví dụ `colors.primary_active → …`. Path chỉ ra key sai; hãy sửa key đó trong theme JSON rồi chạy lại lệnh. Các nguyên nhân thường gặp:

- Một tên chứa `_`, hoặc bắt đầu bằng hai chữ hoa trở lên (`CTA`): hãy dùng camelCase hoặc kebab-case ([Quy tắc đặt key](./reference/theme.md#quy-tắc-đặt-key)).
- Một `$alias` trỏ đến key không nằm trong cùng nhóm token, hoặc các alias tạo thành vòng ([Alias](./reference/theme.md#alias-key)).
- Một override trong `themeAxes` nêu tên một key mà nhóm base không có: key override phải đã tồn tại trong base.
- Hai key trở thành cùng một class sau khi chuyển sang kebab-case (`blue500` và `blue-500`).
- Một giá trị không an toàn hoặc không cân bằng (có `(` hoặc `[` không được đóng).

File output được giữ nguyên trong khi theme còn không hợp lệ.

## Invalid options

`Invalid options:` liệt kê các tùy chọn của bộ sinh có giá trị sai, mỗi dòng một `path → message` (`breakpoints.0 → …`, `coverage.colors.prefixes → …`). Các quy tắc tương tự áp dụng cho các key của `style-gen.config.json` ([Tùy chọn](./reference/options.md)). Một mục `breakpoints` phải trùng tên một screen, và các giá trị `screens` phải là một độ dài `px`/`rem`/`em` với cùng một đơn vị trên toàn bộ map.

## Invalid theme/options

Theme và các tùy chọn đều hợp lệ khi đứng riêng nhưng không hợp lệ khi đi cùng nhau. Dòng lỗi nêu tên tùy chọn: `resetTailwindDefaults.0 → …` nghĩa là theme không có phần thay thế cho namespace mà nó xóa (`"colors"` cần `colors` không rỗng, `"radius"` cần `borderRadius`, `"shadow"` cần `shadows`).

## Invalid config (

`Invalid config (style-gen.config.json):` (hoặc `package.json` khi config nằm dưới `"style-gen"`) được theo sau bởi một dòng cho mỗi vấn đề: một key mà config không có, hoặc một giá trị không hợp lệ cho key đó. Lệnh thoát với mã 1 và giữ nguyên các file đã sinh. Mọi lệnh đọc config đều đưa ra cùng kết luận này: `generate`, `tokens`, `schema`, `doctor` và các plugin (plugin thêm tiền tố `[style-gen-vite]` hoặc `[style-gen-next]` rồi ném lỗi). Một config không phải JSON hợp lệ là trường hợp khác, được mô tả ở [Config hỏng bị bỏ qua](#config-hỏng-bị-bỏ-qua): `generate`, `tokens` và `schema` cảnh báo rồi dùng giá trị mặc định, còn `generate --check`, `doctor` và các plugin thì thất bại. `style-gen schema` ghi `style-gen.config.schema.json` kể cả khi config không hợp lệ, để người nâng cấp có sự trợ giúp của editor khi sửa nó; hãy thêm `"$schema": "./style-gen.config.schema.json"` vào config và editor sẽ đánh dấu key sai ngay khi bạn gõ ([Cấu hình theme → Tự hoàn thành trong editor](./reference/theme.md#tự-hoàn-thành-trong-editor)).

## Config hỏng bị bỏ qua

`Ignoring style-gen.config.json is not valid JSON (<parser message>); using defaults` là một cảnh báo, không phải lỗi. `style-gen generate`, `style-gen tokens` và `style-gen schema` đọc một config không phải JSON hợp lệ như thể nó không tồn tại, nên giá trị mặc định được áp dụng (`styles/theme.json`, `styles/theme.css`) và một `Theme file not found` về sau có thể nêu một đường dẫn mà bạn chưa từng cấu hình. Cùng dòng này xuất hiện với `style-gen.config.json must contain a JSON object` và với `package.json "style-gen" must be a JSON object`. Hãy sửa file trước. `generate --check` ([`--check needs a readable config`](#--check-needs-a-readable-config)), `style-gen doctor` (`Config (<file>) ❌ Ignored`) và các plugin (`Invalid config (<file>):`) từ chối chính file đó thay vì dùng giá trị mặc định.

## --check needs a readable config

`--check needs a readable config: <reason>` đến từ `style-gen generate --check` và thoát với mã 1. Các lệnh khác đọc một config không đọc được như giá trị mặc định; một lệnh kiểm tra làm như vậy sẽ xác nhận một file tokens mà không ai cấu hình. Hãy sửa config (lý do là đoạn `Ignoring …` ở trên) rồi chạy lại lệnh kiểm tra.

## Unrecognized key

`<key> → Unrecognized key` nghĩa là key đó không tồn tại trong object ấy. Gõ nhầm (`breakpoint` thay cho `breakpoints`, `outptu` thay cho `output`) là trường hợp thường gặp. Những key trông quen nhưng không tồn tại:

- Trong `style-gen.config.json`: `plugin`, `extraSources` và `axes`. Các class được dựng lúc runtime được khai báo trong CSS của riêng bạn bằng một `@source inline(...)` thuần của Tailwind, đặt cạnh dòng import file được sinh ra ([Công thức](./cookbook.md#các-class-được-dựng-lúc-runtime)).
- Trong lời gọi plugin: `themePath`, `outDir` và `options`. Chúng là `theme`, thư mục của `output`, và chính các key đó viết trong file config ([Only { root } is accepted](#only--root--is-accepted)).
- Trong theme: `backDropBlurs`. `backDropBlurs → Unrecognized key` nghĩa là theme vẫn dùng cách viết từ trước 8.0: hãy đổi key thành `backdropBlurs`, cả trong các override của `themeAxes` và trong `coverage`, và sinh lại `theme.schema.json` đã commit bằng `style-gen schema` ([migration B5](./migration/7.x-to-8.0.md#b5-backdropblurs-giờ-là-backdropblurs)).

Trang nâng cấp liệt kê mọi lần đổi tên cùng ví dụ trước và sau: [Nâng cấp từ 7.x lên 8.0](./migration/7.x-to-8.0.md).

## Invalid JSON in và Theme file not found

`Invalid JSON in <file>: …` kèm vị trí mà bộ phân tích gặp lỗi: dấu phẩy thừa, chú thích hoặc key không có dấu nháy. `Theme file not found: <file>` nghĩa là đường dẫn trong `theme` (config) hoặc `--theme` không tồn tại so với thư mục gốc của dự án; CLI thêm `Run: yarn style-gen init`, lệnh này ghi một theme và config khởi đầu. `Theme path is a directory` nghĩa là đường dẫn trỏ đến một thư mục.

## escapes project root

`output escapes project root: ../theme.css` nghĩa là một file được sinh sẽ nằm ngoài dự án. `output` và `tokensOutput` (và `--out`) phải nằm trong thư mục gốc dự án; `theme` có thể trỏ đi đâu cũng được, nên một package theme dùng chung là hợp lệ ([Công thức → monorepo](./cookbook.md#một-theme-dùng-chung-cho-nhiều-app-monorepo)). Hãy chuyển đường dẫn output vào trong dự án và import từ đó.

## Không tìm thấy config

`No style-gen.config.json or package.json#style-gen found in <directory>; using the defaults.` là một dòng thông tin, không phải lỗi. `styleGenVite()` và `styleGenNext()` in nó một lần cho mỗi dev server hoặc tiến trình build (kèm tiền tố `[style-gen-vite]` hoặc `[style-gen-next]`; Next.js đánh giá config trong nhiều tiến trình worker, và mỗi tiến trình in nó một lần), còn `style-gen generate` in nó trước `Run: yarn style-gen init` khi theme bị thiếu. Thư mục đó là nơi config được tìm: root của Vite, `process.cwd()` với Next.js, hoặc `root` của plugin. Một thư mục sai (Nuxt 4 đặt root của Vite là `app/`) trông y hệt một dự án không có config: hãy truyền `root` ([Only { root } is accepted](#only--root--is-accepted)), hoặc chạy `yarn style-gen init` để ghi config.

## must be a .ts, .mts or .cts file

`tokensOutput must be a .ts, .mts or .cts file (not a .d.ts declaration): the output is TypeScript, got <path>` nghĩa là module tokens có một đuôi file khác. `style-gen tokens --out` cho cùng thông báo với `--out` thay cho `tokensOutput`, và plugin thêm tiền tố vào nó. Module chứa `export const`, nên cần một tên file TypeScript; một `.d.ts` không thể mang một export lúc runtime. Hãy đổi `tokensOutput` (hoặc `--out`) thành một file như `src/theme/theme.tokens.ts`.

## must be different files

`<a> and <b> must be different files, both resolve to <path>` nghĩa là hai trong ba file được sinh hoặc được đọc dùng chung một đường dẫn, nên một lần ghi sẽ ghi đè lên lần kia. Các tên là `theme`, `output` và `tokensOutput` (`tokens file (theme.tokens.ts beside output)` khi `tokensOutput` chưa đặt; `--out` với `style-gen tokens`). Nguyên nhân thường gặp: `output` trùng `theme` (CSS sẽ thay thế theme JSON), và `output` chính là `theme.tokens.ts` (file tokens mặc định rơi vào đúng file CSS). `style-gen doctor` in cùng đoạn văn bản đó dưới `Output (<output>) ❌ Invalid emit paths` và thoát với mã 1. Hãy cho mỗi vai trò một file riêng; đặt `tokensOutput` khi `output` là một file `.ts`.

## Cannot write

`Cannot write <file>: …` kèm lỗi của hệ thống file (quyền truy cập, thư mục chỉ đọc, đường dẫn là một thư mục). Không có file nào bị ghi dở: file được thay thế theo kiểu nguyên tử hoặc giữ nguyên như cũ.

## Cannot read

`Cannot read <file>: …` kèm lỗi của hệ thống file cho một file tồn tại nhưng không đọc được: theme (`style-gen generate`, các plugin) hoặc file tokens (`generate --check`). Theme bị thiếu và đường dẫn theme là một thư mục có thông báo riêng ([Invalid JSON và theme không tồn tại](#invalid-json-in-và-theme-file-not-found)). `style-gen budget` in `Cannot read <target>: …` cho một đích CSS mà nó không mở được và thoát với mã 2. Hãy kiểm tra quyền truy cập của file được nêu trong thông báo.

## File tokens bị thiếu hoặc lỗi thời

`<file> does not exist. Run: style-gen generate` và `<file> is out of date. Run: style-gen generate` đến từ `style-gen generate --check`: file `theme.tokens.ts` đã commit không khớp với theme và config. Hãy chạy `yarn style-gen generate` (hoặc khởi động dev server, nơi plugin ghi file đó) rồi commit file. File chỉ chứa các key token, nên chỉ sửa một giá trị màu thì nó vẫn còn mới.

Một file lỗi thời ngay sau một lần `generate` sạch đã bị một công cụ khác ghi lại. Chỉ Prettier tôn trọng dòng `// prettier-ignore` mà file mang trước mỗi export; hãy loại `theme.tokens.ts` khỏi Biome, dprint, oxfmt, `--fix` stylistic của ESLint và mọi glob lint-staged có ghi lại file. Một bản checkout có kết thúc dòng CRLF không phải nguyên nhân: phép so sánh bỏ qua chúng.

## Cannot reload config và Re-emit failed

Cả hai đến từ một dev server đang chạy hoặc `style-gen generate --watch`, và không cái nào làm nó dừng. `[style-gen-vite] Cannot reload config, keeping the previous one:` (hoặc `[style-gen-next]`) được theo sau bởi lý do: một lần sửa `style-gen.config.json` (hoặc `package.json#style-gen`) không dùng được, ví dụ một `output` nằm ngoài thư mục gốc dự án. CLI in `Cannot reload config: <reason>` cho cùng lỗi đó và `Invalid config (<file>):` kèm các vấn đề khi lần sửa làm hỏng schema. Config trước đó vẫn được dùng cho đến khi file được sửa. `[style-gen-vite] Re-emit failed:` được theo sau bởi thông báo của lỗi theme hoặc lỗi ghi file đã làm dừng việc sinh lại (`Invalid theme (…)`, `Cannot write …`); `theme.css` tốt gần nhất được giữ. Hãy sửa điều thông báo nêu rồi lưu lại. Cả hai file config đều được theo dõi, nên việc tạo `style-gen.config.json` hoặc chuyển config giữa hai file được nhận mà không cần khởi động lại; một lần sửa phần còn lại của `package.json` (`yarn add`) bị bỏ qua khi `style-gen.config.json` tồn tại.

## Only { root } is accepted

`[style-gen-vite] Invalid options:` kèm theo `Only { root } is accepted` nghĩa là plugin nhận một đối số khác `root`. `styleGenVite()` và `styleGenNext()` chỉ nhận `{ root }`, thư mục chứa `style-gen.config.json`; mọi tùy chọn của bộ sinh là một key của file đó. Hãy gọi plugin không đối số, và đặt `theme`, `output`, `tokensOutput`, `breakpoints` cùng phần còn lại vào config ([Vite và Nuxt](./reference/vite.md)). Nuxt 4 đặt root của Vite là `app/`, nên ở đó hãy truyền thư mục dự án làm `root`.

## --check and --watch cannot be combined

`--check` không ghi gì và thoát; `--watch` chạy liên tục và ghi sau mỗi thay đổi. Dùng `--check` trong CI và `--watch` khi đang chỉnh sửa.

## init dừng với mã thoát 1

`style-gen init --yes` không bao giờ ghi đè và không bao giờ chuyển hướng một config có sẵn, nên nó dừng thay vì đoán:

- `<file> is invalid, so --yes cannot tell where its theme lives:` theo sau là các vấn đề của config và `💡 Fix it first: yarn style-gen doctor`. Hãy xoá các key đã gỡ hoặc gõ sai (`extraSources`, `axes`, `plugin`: [migration B10](./migration/7.x-to-8.0.md#b10-các-helper-migration-bị-gỡ)) rồi chạy lại, hoặc dùng `style-gen init --rules-only` để chỉ làm mới các quy tắc cho agent.
- `--theme <path> differs from the theme of <file> (<path>); --yes never redirects an existing config.` theo sau là `💡 Drop --theme, or run init without --yes to change it`. Hãy bỏ `--theme`, hoặc sửa `theme` trong config.

`The theme of <file> (<path>) is outside the project root: init writes no theme or theme schema for it.` là một dòng thông tin, không phải thất bại: một theme dùng chung (monorepo) không được scaffold, và `init` chỉ ghi schema của config cùng các quy tắc.

## schema từ chối hai file cùng một đường dẫn

`--out and --config-out name the same file: <path>`, `--out would overwrite the theme file: <path>` và `--config-out would overwrite the theme file: <path>` nghĩa là schema của theme, schema của config và theme JSON phải là ba file khác nhau. `style-gen schema` không ghi gì và thoát với mã 1 cho đến khi chúng khác nhau. Hãy chọn đường dẫn khác cho `--out` và `--config-out`.

## Một class không có style

Hãy kiểm tra theo thứ tự:

1. Key có trong theme và class dùng tên kebab-case của nó: `blue500` là `bg-blue-500`, `text16Medium` là `text-16-medium`.
2. `theme.css` được import cạnh `@import "tailwindcss"`, và đường dẫn khớp với `output` trong config.
3. Class không được dựng lúc runtime. Một template literal như `` `bg-${variant}` `` vô hình trước lượt quét của Tailwind: hãy khai báo các class đó bằng `@source inline(...)` của riêng bạn ([Tùy chọn](./reference/options.md#class-được-tạo-lúc-runtime)).
4. `coverage` không cắt mất class, và một class có opacity (`bg-primary/10`) có mức của nó trong `coverage.colors.opacities` ([`coverage`](./reference/options.md#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token)).
5. Key không trùng với một class có sẵn của Tailwind (`bg-none`, `text-sm`): `style-gen doctor` in cảnh báo cho các trường hợp trùng đã biết ([Cấu hình theme](./reference/theme.md#trùng-tên-với-utility-tích-hợp-sẵn)).

## theme.css bị thiếu

Dev server hoặc bản build chưa chạy bộ sinh. Với Vite, `styleGenVite()` được liệt kê trước `tailwindcss()`; với Next, config được bọc trong `styleGenNext()`; nếu không có cả hai, `yarn style-gen generate` chạy trước dev server và trước bản build ([Công thức](./cookbook.md#sinh-css-mà-không-cần-plugin-bundler)). `yarn style-gen doctor` in `Output (…) ⚠️ Not generated yet` cho đến khi file tồn tại.

## tailwind-merge giữ lại sai class

Một `twMerge` thuần không biết `text-16-medium`, `rounded-pill` hay `shadow-card` của theme, nên nó có thể giữ lại class đứng trước. Hãy tạo một `cn` cho mỗi theme bằng `createCn(tokens)` ([Xây dựng component → `cn`](./getting-started/build-components.md#4-cn-gộp-class-có-tính-đến-các-class-của-theme)).
