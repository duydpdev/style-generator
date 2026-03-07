# Project Plan: CLI DX Overhaul — Smart Defaults, Doctor & Full Templates

## 🎯 Overview

Nâng cấp toàn diện CLI `style-gen` để trải nghiệm người dùng mượt mà nhất:

- `npx style-gen init` → tự detect `src/`, sinh `style-gen.config.json`, plugin template đầy đủ options
- `npx style-gen safelist` → đọc config tự động, error messages rõ ràng
- `npx style-gen doctor` → kiểm tra setup + validate schema, gợi ý sửa lỗi

## 📱 Project Type

LIBRARY (CLI Tool)

## ✅ Success Criteria

1. `style-gen init` → `style-gen safelist` chạy thành công **không cần bất kỳ flag** `--theme` nào.
2. Plugin file sinh ra chứa **đầy đủ options** (comment sẵn) + export `DesignTokens`.
3. `style-gen doctor` in ra bảng trạng thái rõ ràng (theme ✅/❌, plugin ✅/❌, config ✅/❌, schema valid ✅/❌).
4. Nhập path sai (folder, dấu `/` đầu) → CLI báo lỗi rõ ràng + gợi ý cách sửa.
5. `style-gen --version` hoạt động.
6. Chạy `init` lần 2 → cảnh báo overwrite, không ghi đè mất data.

## 📋 Task Breakdown

### [x] Task 1: `init` — Config persistence + Smart defaults + Overwrite protection

- **Input**: `src/cli/commands/init.ts`, `src/cli/config.ts`
- **Output**:
  - Detect `src/` → đổi `initialValue` thành `src/styles/theme.json` và `src/plugins/theme-plugin.ts`
  - Ghi `style-gen.config.json` với `{ theme, plugin, output }`
  - Output path tự derive từ theme path (cùng folder + `safelist.txt`)
  - Thêm check file đã tồn tại → hỏi confirm overwrite
  - Xóa/sửa log sai `"Updated your CSS file"` (hiện không có code nào thực sự sửa CSS)
  - Path normalization: strip `/` đầu

### [x] Task 2: `safelist` — Path validation + Error messages thông minh

- **Input**: `src/cli/commands/safelist.ts`
- **Output**:
  - Normalize path: strip `/` đầu
  - Check `isDirectory()` → báo lỗi kèm gợi ý tên file
  - Check `!existsSync` → báo lỗi kèm gợi ý `"Run: npx style-gen init"`

### [x] Task 3: `templates.ts` — Plugin template đầy đủ options

- **Input**: `src/cli/templates.ts`
- **Output**: `getPluginTemplate()` sinh code với đầy đủ options (comment sẵn) + export `DesignTokens`

### [x] Task 4: `doctor` command + `--version` flag

- **Input**: Tạo mới `src/cli/commands/doctor.ts`, cập nhật `src/cli/index.ts`
- **Output**:
  - `style-gen doctor`: check config, theme (tồn tại + JSON valid + schema có `colors`/`typography`), plugin, output
  - `style-gen --version` / `-v`: đọc version từ `package.json`
  - Clean up duplicate comment `/* Help Printer */` trong `index.ts`

### [x] Task 5: Build, Lint, Test

- **Input**: Toàn bộ codebase
- **Output**: Pass `npm run build`, `npm run lint`, `npm test`

### [x] Task 6: Cập nhật Documentation

- **Input**: `README.md` và các docs liên quan
- **Output**: Cập nhật hướng dẫn CLI với `doctor`, `--version`, `style-gen.config.json`
