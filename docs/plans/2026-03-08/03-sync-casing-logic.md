# Project Plan: Đồng bộ Casing Logic (Hard Rule: JS=camel, CSS=kebab)

## 🎯 Overview

Tối ưu hóa kiến trúc bằng cách loại bỏ option dư thừa `preserveCasing` và áp dụng luật cứng (Hard Rule):

- Design Tokens trong React (JS) **BẮT BUỘC** là `camelCase`.
- CSS Variables và Tailwind classes **BẮT BUỘC** là `kebab-case`.

## 📱 Project Type

LIBRARY (@duydpdev/style-generator)

## ✅ Success Criteria

1. Xóa bỏ hoàn toàn option `preserveCasing` khỏi hệ thống.
2. `DesignTokens` xuất ra các key ở dạng `camelCase` (bao gồm cả nested object, ví dụ `muted: { darker: "#000" }` -> `mutedDarker`).
3. CSS Variables (vd: `--color-text-muted-darker`) luôn là `kebab-case`.
4. Tailwind theme extend (classes) luôn là `kebab-case`.
5. TypeScript Inference `InferColorKeys` đưa ra đúng type `camelCase` tương ứng với giá trị runtime.

## 📋 Task Breakdown

### [x] Task 1: Gắn Hard Rule cho tầng CSS/Tailwind

- **Agent**: backend-specialist
- **Input**: `src/core/Options.ts`, `src/features/plugin/cssVariables.ts`, `src/features/plugin/createStylePlugin.ts`, `src/features/safelist/generateSafelist.ts`, `src/shared/helpers.ts`
- **Output**:
  - Xóa `preserveCasing` khỏi Options.
  - Xóa biến này ở mọi files.
  - Tất cả gen ra string css/tailwind đều ép qua `toKebabCase` (mặc định tham số trong `extractData`).
- **Verify**: Compiler không báo lỗi truyền thiếu param sau khi xóa.

### [x] Task 2: Gắn Hard Rule cho tầng DesignTokens (Runtime)

- **Agent**: backend-specialist
- **Input**: `src/features/tokens/createDesignTokens.ts`, `src/shared/helpers.ts`
- **Output**:
  - Đảm bảo array path khi resolve nested colors sẽ join theo dạng `camelCase` (sử dụng `toCamelCase`).
  - Mọi output từ hàm này (variantText, variantColor...) đều mang định dạng `camelCase`.
- **Verify**: Script log tokens test ra đúng `camelCase`.

### [x] Task 3: Cập nhật TypeScript Inference (Types)

- **Agent**: backend-specialist
- **Input**: `src/core/inference.ts`
- **Output**:
  - Cập nhật type `NestedKeys` và thêm helper `CamelCase` type.
  - Return type `InferColorKeys` thành camelCase chuẩn xác thay vì ghép bằng dấu gạch `-` (hyphen).
- **Verify**: VSCode Intellisense trong file `examples/test-cva.ts`.

### [x] Task 4: Sửa Test Cases & Run Audit

- **Agent**: project-planner
- **Input**: Các file `*.test.ts`
- **Output**: Cập nhật describe test phù hợp với behavior mới. Cả project passing `checklist.py`.
- **Verify**: Đạt 100% test pass.

## 🧪 Verification Plan

### Automated Tests

- `yarn test`: Đảm bảo pass hết các scenario kiểm tra Casing.

### Manual Verification

- Output compile của Plugin. Type inferences ở userland.
