# Project Plan: Thêm Unit Tests & Fix Python3

## 🎯 Overview

Dự án hiện tại chưa có Unit Tests cũng như script test nội bộ. Đồng thời, các script kiểm tra Agent (`.agent/scripts/checklist.py`) đang gọi trực tiếp lệnh `python`, gây lỗi trên các môi trường chỉ có `python3` (như macOS M-series, Linux hiện đại) hoặc khác biệt trên Windows. Plan này nhằm cấu hình Vitest và chuẩn hóa hệ thống chạy Script đảm bảo hoạt động ĐA NỀN TẢNG (Linux, Windows, macOS).

## 📱 Project Type

WEB / BACKEND (Node.js Library)

## ✅ Success Criteria

1. Lệnh `yarn test` và `yarn test:types` hoặc `yarn test:coverage` chạy thành công bằng Vitest.
2. Các file xử lý lõi CSS Variables (`cssVariables.ts`, `createDesignTokens.ts`, `generateSafelist.ts`, `inference.ts`) đều được phủ test/typecheck.
3. Đảm bảo toàn bộ scripts hoạt động Cross-platform (Linux, Windows, macOS). Chuẩn hóa lệnh gọi Python thông qua cơ chế tự động nhận diện hoặc sử dụng `python3` / `python` phù hợp với từng HĐH.

## 📋 Task Breakdown

### [ ] Task 1: Setup Vitest & Scripts

- **Agent**: `backend-specialist`
- **Input**: `package.json`, `vitest.config.ts` (new)
- **Output**: Dependencies `vitest`, `@vitest/coverage-v8` được cài. Có 3 scripts `test`, `test:coverage`, `test:types`.
- **Verify**: `yarn run test` chạy lên framework Vitest mà không báo lỗi lệnh.

### [ ] Task 2: Unit Tests cho CSS Variables Engine

- **Agent**: `backend-specialist`
- **Input**: `src/features/plugin/cssVariables.ts`, `src/features/plugin/cssVariables.test.ts`
- **Output**: Test suite đảm bảo flatten và var mapping đệ quy hoạt động đúng, đặc biệt test rules bỏ qua key `DEFAULT`.
- **Verify**: Tất cả test cases trong suite này Pass.

### [ ] Task 3: Unit Tests cho Token Generation & Safelist

- **Agent**: `backend-specialist`
- **Input**: `src/features/tokens/createDesignTokens.ts`, `src/features/safelist/generateSafelist.ts` và các file test tương ứng.
- **Output**: Đảm bảo variantBaseColor, variantTextColor, variantCommonColor xuất ra array keys chính xác với config nested.
- **Verify**: Tất cả test cases trong suite này Pass.

### [ ] Task 4: Type Testing (Typecheck) cho Inference

- **Agent**: `backend-specialist`
- **Input**: `src/core/inference.ts`, `src/core/inference.test-d.ts` (new)
- **Output**: Test đảm bảo Typescript hiểu đúng Type được gen ra (e.g. loại bỏ `DEFAULT` trong type trả về, support `NestedKeys`).
- **Verify**: `vitest typecheck` hoặc chạy `yarn test` pass các assertion kiểu `expectTypeOf`.

### [ ] Task 5: Cross-platform Script Support (Standardization)

- **Agent**: `orchestrator`
- **Input**: Internal scripts in `.agent/scripts/*.py`.
- **Output**: Cơ chế chạy script nhận diện được môi trường:
  - Windows: Thường dùng `python`.
  - macOS/Linux: Thường dùng `python3`.
- **Verify**: Kiểm tra thủ công hoặc dùng Agent giả lập chạy lệnh trên các môi trường khác nhau đảm bảo không dính lỗi `command not found`.
