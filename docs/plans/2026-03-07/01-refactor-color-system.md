# Project Plan: Style Generator Refactor (Nested Theme)

## 🎯 Overview

Nâng cấp Core Engine của `fe-style-generator` để hỗ trợ hệ thống "Hybrid Theme": hỗ trợ thêm bucket `common` bên cạnh `base` / `text`, và đặc biệt cho phép Object màu nested (lồng nhau) hỗ trợ bypass prefix bằng từ khoá `DEFAULT` – đáp ứng hoàn hảo Shadcn UI Tokens, đồng thời giúp TypeScript Infer đúng Types (Zero-CSS Configuration engine). Giải quyết triệt để lỗi Type mismatch và prefix lằng nhằng trước đó.

## 📱 Project Type

WEB / BACKEND (Node.js Library)

## ✅ Success Criteria

1. Tái cấu trúc thành công `ThemeConfig` có 3 root buckets: `base`, `text`, `common`. Type là `Record<string, string | Record<string, string>>`.
2. Logic `flattenToVars` và `mapToVarRefs` (core plugin CSS) được viết đệ quy, đồng thời skip `-` prefix khi key là `DEFAULT`.
3. Cung cấp flag thiết lập `disableColorPrefix?: boolean` trong `StyleGeneratorOptions`.
4. Typescript Type `InferColorKeys` và `DesignTokensWeb` phải trích xuất chính xác 100% key string (không prefix) đi sâu tới tận cùng qua định dạng `NestedKeys`, không bị dính `DEFAULT`.
5. Build Linter và `tsc` chạy qua không cảnh báo/lỗi, file xuất ra bundle chuẩn.

## 📋 Task Breakdown

### [x] Task 1: Update Theme Core Types

- **Agent**: `backend-specialist`
- **Input**: `src/core/ThemeConfig.ts`, `src/core/Options.ts`
- **Output**: Bổ sung option `disableColorPrefix` và định nghĩa type cho 3 bucket color nested.
- **Verify**: IDE không báo lầm lỗi cấu trúc. Truyền thử object nested không bị rạch đỏ.

### [x] Task 2: Refactor CSS Variables Core

- **Agent**: `backend-specialist`
- **Input**: `src/features/plugin/cssVariables.ts`
- **Output**: 2 hàm `flattenToVars` và `mapToVarRefs` được đổi thành đệ quy. Bỏ nối `-` prefix chỗ nào key là `DEFAULT`. Cho chèn cờ `disablePrefix`.
- **Verify**: Viết test/kiểm tra thủ công in ra JSON CSS xem node cuối có chuẩn `--prefix-name` không.

### [x] Task 3: Cập nhật Tool Tạo Plugin Tailwind

- **Agent**: `backend-specialist`
- **Input**: `src/features/plugin/createStylePlugin.ts`
- **Output**: Đọc `ThemeConfig` theo 3 luồng (base, text, common). Truyền flag `disablePrefix` từ options xuống core Var Mapper. Hợp sức build `colorConfig` hoàn chỉnh mà không gặp Cognitive Complexity limits (Extract helper function `buildColorConfig`).
- **Verify**: Code TS sạch đẹp. Hàm giảm chỉ số `cognitive-complexity` < 15.

### [x] Task 4: Nâng cấp TypeScript Type Inference

- **Agent**: `backend-specialist`
- **Input**: `src/core/inference.ts`
- **Output**: Định nghĩa generic `NestedKeys<T>`. Loại bỏ key `DEFAULT` và join nested key bằng gạch ngang `-`. Nâng cấp interface `DesignTokensWeb` để gộp 3 nhánh biến.
- **Verify**: Check file Test inference thấy variantTextColor hay commonColor extract ra key chính xác dạng Union types.

### [x] Task 5: Sửa Types tại Design Tokens và Safelist

- **Agent**: `backend-specialist`
- **Input**: `src/features/safelist/generateSafelist.ts`, `src/features/tokens/createDesignTokens.ts`
- **Output**: Tạo đệ quy `extractKeys()` giống core cho cả runtime token values, nối array keys đầy đủ (`base`, `text`, `common`) không lỗi cast type `any`.
- **Verify**: Build command `yarn tsc` báo Success. Không còn lỗi type incompatibility.
