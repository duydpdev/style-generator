<!-- source: documents/troubleshooting.md sha256: ad9b4c34bfa3 -->

# Khắc phục sự cố

Tìm phần đầu của thông báo mà CLI, `styleGenVite()` hoặc `styleGenNext()` đã in, rồi đọc mục có cùng tiêu đề. Các plugin bundler thêm tiền tố `[style-gen-vite]` hoặc `[style-gen-next]` vào mọi thông báo; phần văn bản sau tiền tố giống với của CLI. Các thông báo kiểm tra hợp lệ liệt kê một dòng `path → message` cho mỗi vấn đề. `yarn style-gen doctor` ([CLI](./reference/cli.md#style-gen-doctor)) kiểm tra config, theme và CSS đã sinh chỉ trong một lần chạy.

| Thông báo bắt đầu bằng                                          | Đọc                                                                               |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `Invalid theme (`                                               | [Invalid theme](#invalid-theme-)                                                  |
| `Invalid options`                                               | [Invalid options](#invalid-options)                                               |
| `Invalid theme/options`                                         | [Invalid theme/options](#invalid-themeoptions)                                    |
| `Invalid config (`                                              | [Invalid config](#invalid-config-)                                                |
| `… → Unrecognized key`                                          | [Unrecognized key](#unrecognized-key)                                             |
| `Invalid JSON in`, `Theme file not found`                       | [Invalid JSON và theme không tồn tại](#invalid-json-in-và-theme-file-not-found)   |
| `… escapes project root`                                        | [escapes project root](#escapes-project-root)                                     |
| `Cannot write`                                                  | [Cannot write](#cannot-write)                                                     |
| `… does not exist. Run: style-gen generate`, `… is out of date` | [File tokens bị thiếu hoặc lỗi thời](#file-tokens-bị-thiếu-hoặc-lỗi-thời)         |
| `Only { root } is accepted`                                     | [Only { root } is accepted](#only--root--is-accepted)                             |
| `--check and --watch cannot be combined`                        | [--check and --watch cannot be combined](#--check-and---watch-cannot-be-combined) |

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

`Invalid config (style-gen.config.json):` (hoặc `package.json` khi config nằm dưới `"style-gen"`) được theo sau bởi một dòng cho mỗi vấn đề. Bộ sinh không bao giờ quay về giá trị mặc định khi config hỏng: hãy sửa file rồi chạy lại. Một config không phải JSON hợp lệ cũng được báo theo cách đó. `style-gen schema` ghi `style-gen.config.schema.json`; hãy thêm `"$schema": "./style-gen.config.schema.json"` vào config và editor sẽ đánh dấu key sai ngay khi bạn gõ ([Cấu hình theme → Tự hoàn thành trong editor](./reference/theme.md#tự-hoàn-thành-trong-editor)).

## Unrecognized key

`<key> → Unrecognized key` nghĩa là key đó không tồn tại trong object ấy. Gõ nhầm (`breakpoint` thay cho `breakpoints`, `outptu` thay cho `output`) là trường hợp thường gặp. Những key trông quen nhưng không tồn tại:

- Trong `style-gen.config.json`: `plugin`, `extraSources` và `axes`. Các class được dựng lúc runtime được khai báo trong CSS của riêng bạn bằng một `@source inline(...)` thuần của Tailwind, đặt cạnh dòng import file được sinh ra ([Công thức](./cookbook.md#các-class-được-dựng-lúc-runtime)).
- Trong lời gọi plugin: `themePath`, `outDir` và `options`. Chúng là `theme`, thư mục của `output`, và chính các key đó viết trong file config ([Only { root } is accepted](#only--root--is-accepted)).
- Trong theme: `backDropBlurs`. Key đúng là `backdropBlurs`, cả trong các override của `themeAxes` và trong `coverage`.

Trang nâng cấp liệt kê mọi lần đổi tên cùng ví dụ trước và sau: [Nâng cấp từ 7.x lên 8.0](./migration/7.x-to-8.0.md).

## Invalid JSON in và Theme file not found

`Invalid JSON in <file>: …` kèm vị trí mà bộ phân tích gặp lỗi: dấu phẩy thừa, chú thích hoặc key không có dấu nháy. `Theme file not found: <file>` nghĩa là đường dẫn trong `theme` (config) hoặc `--theme` không tồn tại so với thư mục gốc của dự án; CLI thêm `Run: yarn style-gen init`, lệnh này ghi một theme và config khởi đầu. `Theme path is a directory` nghĩa là đường dẫn trỏ đến một thư mục.

## escapes project root

`output escapes project root: ../theme.css` nghĩa là một file được sinh sẽ nằm ngoài dự án. `output` và `tokensOutput` (và `--out`) phải nằm trong thư mục gốc dự án; `theme` có thể trỏ đi đâu cũng được, nên một package theme dùng chung là hợp lệ ([Công thức → monorepo](./cookbook.md#một-theme-dùng-chung-cho-nhiều-app-monorepo)). Hãy chuyển đường dẫn output vào trong dự án và import từ đó.

## Cannot write

`Cannot write <file>: …` kèm lỗi của hệ thống file (quyền truy cập, thư mục chỉ đọc, đường dẫn là một thư mục). Không có file nào bị ghi dở: file được thay thế theo kiểu nguyên tử hoặc giữ nguyên như cũ.

## File tokens bị thiếu hoặc lỗi thời

`<file> does not exist. Run: style-gen generate` và `<file> is out of date. Run: style-gen generate` đến từ `style-gen generate --check`: file `theme.tokens.ts` đã commit không khớp với theme và config. Hãy chạy `yarn style-gen generate` (hoặc khởi động dev server, nơi plugin ghi file đó) rồi commit file. File chỉ chứa các key token, nên chỉ sửa một giá trị màu thì nó vẫn còn mới.

## Only { root } is accepted

`[style-gen-vite] Invalid options:` kèm theo `Only { root } is accepted` nghĩa là plugin nhận một đối số khác `root`. `styleGenVite()` và `styleGenNext()` chỉ nhận `{ root }`, thư mục chứa `style-gen.config.json`; mọi tùy chọn của bộ sinh là một key của file đó. Hãy gọi plugin không đối số, và đặt `theme`, `output`, `tokensOutput`, `breakpoints` cùng phần còn lại vào config ([Vite và Nuxt](./reference/vite.md)). Nuxt 4 đặt root của Vite là `app/`, nên ở đó hãy truyền thư mục dự án làm `root`.

## --check and --watch cannot be combined

`--check` không ghi gì và thoát; `--watch` chạy liên tục và ghi sau mỗi thay đổi. Dùng `--check` trong CI và `--watch` khi đang chỉnh sửa.

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
