<!-- source: documents/guide.md sha256: 7efaac4e19ed -->

# Hướng dẫn sử dụng

`@duydpdev/style-generator` biên dịch một theme JSON thành các utility **Tailwind CSS v4**, design token có kiểu và một JSON Schema, chỉ với một lần gọi `generate()`. Thư viện chỉ hỗ trợ Tailwind v4 (`tailwindcss ^4.1.0`). Trang này là phần tổng quan: nó cho thấy các mảnh ghép khớp nhau thế nào và chỉ bạn đến trang sở hữu từng tác vụ.

- [Cách hoạt động](#cách-hoạt-động)
- [Tám bước](#tám-bước)
- [Tìm gì ở đâu](#tìm-gì-ở-đâu)
- [Các quy tắc luôn đúng](#các-quy-tắc-luôn-đúng)

## Cách hoạt động

```text
theme.json + style-gen.config.json
        │
        ▼  generate()  (run by the plugin or the CLI)
theme.css          → @import it next to `@import "tailwindcss"`   (git-ignored)
theme.tokens.ts    → typed token keys for app code               (committed)
theme.schema.json  → editor autocomplete for the theme           (optional)
```

- `theme.json` chứa các design token; chỉ `colors` là bắt buộc. Theme được kiểm tra bằng một schema chặt chẽ: key lạ, giá trị không an toàn và alias hỏng đều bị từ chối trước khi bất kỳ CSS nào được ghi.
- `style-gen.config.json` chứa mọi tùy chọn của bộ sinh (`theme`, `output`, `tokensOutput`, `breakpoints`, `coverage`, …). CLI và cả hai plugin bundler đọc cùng một file này.
- `theme.css` là một file duy nhất gồm các biến `--sg-*`, phần ánh xạ `@theme inline`, các khối `@utility` và các dòng `@source inline` giữ mọi class của token trong bản build. Không cần `@plugin`, không cần safelist.
- `theme.tokens.ts` export `tokens`, `Tokens`, `themeAxes` và `ThemeAxesState`. Component import từ đây thay vì từ theme JSON, nên client bundle không chứa Zod và không chứa mã Node.

## Tám bước

1. **Cài đặt** package và các peer của nó ([README](./README.md#cài-đặt)).
2. **Viết theme** trong `theme.json`: màu trước, rồi typography, shadow, radius, font, độ rộng viền và `themeAxes` ([Cấu hình theme](./reference/theme.md)).
3. **Viết `style-gen.config.json`**, hoặc để `yarn style-gen init` tạo sẵn ([CLI](./reference/cli.md#style-gen-init)).
4. **Nối dây bằng một lệnh gọi, không đối số**: `styleGenVite()` trong `vite.config.ts`, `styleGenNext()(nextConfig)` trong `next.config.ts`, hoặc `yarn style-gen generate` khi không có plugin bundler ([Vite và Nuxt](./reference/vite.md), [Next.js](./reference/next.md)).
5. **Import `theme.css`** cạnh `@import "tailwindcss"` và commit `theme.tokens.ts`.
6. **Dựng component** trên các token có kiểu: recipe, `cn`, các prop spacing và layout ([Xây dựng component](./getting-started/build-components.md)).
7. **Chuyển theme** bằng cách đặt các attribute `data-<axis>="<variant>"` lên `<html>` ([Các trục theme](./reference/theme.md#theme-nhiều-trục-themeaxes), [recipe chế độ tối](./cookbook.md#nút-chuyển-chế-độ-tối)).
8. **Canh gác trong CI**: `style-gen generate --check`, `style-gen doctor` và `style-gen budget` ([CLI](./reference/cli.md)).

## Tìm gì ở đâu

| Tôi muốn …                                | Xem                                                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| cài đặt package                           | [README → Cài đặt](./README.md#cài-đặt)                                                                     |
| thiết lập một app React + Vite            | [Bắt đầu: React + Vite](./getting-started/react-vite.md)                                                    |
| thiết lập một app Next.js                 | [Bắt đầu: Next.js](./getting-started/next.md)                                                               |
| thiết lập một app Nuxt                    | [Bắt đầu: Nuxt + Vue](./getting-started/nuxt-vue.md)                                                        |
| viết theme: key, alias, trạng thái, trục  | [Cấu hình theme](./reference/theme.md)                                                                      |
| đổi CSS nào được sinh ra                  | [Tùy chọn](./reference/options.md)                                                                          |
| dựng component từ theme                   | [Xây dựng component](./getting-started/build-components.md)                                                 |
| thêm nút chuyển chế độ tối                | [Công thức → Nút chuyển chế độ tối](./cookbook.md#nút-chuyển-chế-độ-tối)                                    |
| dùng các prop spacing                     | [Spacing](./reference/spacing.md)                                                                           |
| dùng chung một theme cho nhiều app        | [Công thức → Một theme dùng chung cho nhiều app](./cookbook.md#một-theme-dùng-chung-cho-nhiều-app-monorepo) |
| làm CI thất bại khi CSS phình ra          | [Công thức → Làm CI thất bại khi CSS phình ra](./cookbook.md#làm-ci-thất-bại-khi-css-phình-ra)              |
| chạy CLI: `init`, `generate`, `doctor`, … | [CLI](./reference/cli.md)                                                                                   |
| gọi `generate()` từ script của riêng tôi  | [API lõi → `generate`](./reference/core.md#generate)                                                        |
| hiểu một thông báo lỗi                    | [Khắc phục sự cố](./troubleshooting.md)                                                                     |
| sao chép các component dựng sẵn           | [Component](./components.md)                                                                                |
| để một coding agent tuân theo các quy ước | [Hợp đồng cho agent](./agent-contract.md)                                                                   |
| tra các khoảng phiên bản peer dependency  | [API lõi → Các peer dependency](./reference/core.md#các-peer-dependency)                                    |
| nâng cấp từ 8.x                           | [Nâng cấp 8.x → 9.0](./migration/8.x-to-9.0.md)                                                             |
| nâng cấp từ 7.x                           | [Nâng cấp 7.x → 8.0](./migration/7.x-to-8.0.md)                                                             |

## Các quy tắc luôn đúng

- **Token là các key camelCase phẳng**: `blue500` trở thành `--color-blue-500` và `bg-blue-500`; object lồng nhau và `DEFAULT` không được hỗ trợ. `_` bị từ chối trong mọi tên ([Quy tắc đặt key](./reference/theme.md#quy-tắc-đặt-key)).
- **Alias nằm trong một nhóm token**: `"$blue500"` trong `colors` trỏ đến `colors.blue500`.
- **Đường dẫn**: `theme` có thể nằm ngoài dự án (một package theme dùng chung); `output` và `tokensOutput` phải nằm trong dự án.
- **Theme chuyển trên `<html>`**: selector được ghim vào `html` và attribute là `data-<axis-kebab>`; cả hai đều không cấu hình được.
- **Commit `theme.tokens.ts`, bỏ qua `theme.css`.**
