# Project Plan: Update Docs, README & Examples for v2

## 🎯 Overview

Sau khi refactor v2 (flat colors, safelistColors, tailwindVersion, themeCss), cần cập nhật tất cả tài liệu và ví dụ để phản ánh API mới và xóa các tham chiếu đến v1 (colorNamingMode, disableColorPrefix, enableCssVariables, colors.base/text/common).

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. `README.md` không còn đề cập `colorNamingMode`, `disableColorPrefix`, `enableCssVariables`, `colors.base/text/common`
2. `docs/guide.md` phản ánh đúng v2 API
3. `examples/` hoạt động với theme.json đã flat, có thêm ví dụ `themeCss`
4. `examples/test-css-vars.ts` dùng options v2 (không dùng `enableCssVariables`)
5. `yarn tsc --noEmit` vẫn pass sau khi cập nhật examples

## 📋 Task Breakdown

### [x] Task 1: Rewrite README.md

- **Input**: `README.md` (v1 format)
- **Output**: README phản ánh v2 — flat colors, safelistColors, tailwindVersion, themeCss
- **Verify**: Không còn mentions `colorNamingMode`, `base/text/common`

### [x] Task 2: Rewrite docs/guide.md

- **Input**: `docs/guide.md`
- **Output**: Guide cập nhật — flat colors, remove Hybrid Theme system docs
- **Verify**: Review nội dung

### [x] Task 3: Update examples/v4-plugin.ts

- **Input**: `examples/v4-plugin.ts`
- **Output**: Destructure `themeCss` từ `createStyleSystem`, thêm comment hướng dẫn v4
- **Verify**: `yarn tsc --noEmit`

### [x] Task 4: Update examples/tailwind.config.ts

- **Input**: `examples/tailwind.config.ts`
- **Output**: Add `tailwindVersion: 3` option explicitly
- **Verify**: `yarn tsc --noEmit`

### [x] Task 5: Update examples/test-css-vars.ts

- **Input**: `examples/test-css-vars.ts`
- **Output**: Remove `enableCssVariables` option, test v3 vs v4 version split instead
- **Verify**: `yarn tsc --noEmit`
