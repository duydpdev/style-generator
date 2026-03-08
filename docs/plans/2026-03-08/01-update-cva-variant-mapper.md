# Project Plan: Update CVA Variant Mapper to support Kebab Case

## 🎯 Overview

Cập nhật hàm `createVariantMapper` để tự động chuyển đổi các token (camelCase) thành class CSS (kebab-case). Điều này giúp việc truyền props trong React/JS tự nhiên hơn (camelCase) nhưng vẫn đảm bảo output class CSS đúng chuẩn Tailwind (kebab-case).

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. `createVariantMapper` chuyển đổi thành công `primaryColor` -> `prefix-primary-color`.
2. Hỗ trợ Type Inference chính xác cho cả key (camelCase) và value (kebab-case).
3. Vượt qua các bước kiểm tra của `checklist.py`.

## 📋 Task Breakdown

### [x] Task 1: Export helpers từ shared index

- **Agent**: `frontend-specialist`
- **Input**: `src/shared/index.ts`
- **Output**: Export `toKebabCase` và các helpers khác để module CVA sử dụng được.
- **Verify**: Kiểm tra file index có `export * from "./helpers"`.

### [x] Task 2: Cập nhật logic và Type cho createVariantMapper

- **Agent**: `frontend-specialist`
- **Input**: `src/features/cva/createVariantMapper.ts`
- **Output**: Hàm `createVariantMapper` sử dụng `toKebabCase` và có Type `KebabCase<S>`.
- **Verify**: Chạy script test nhỏ để kiểm tra output string.

### [x] Task 3: Chạy Final Audit

- **Agent**: `orchestrator`
- **Input**: Toàn bộ codebase
- **Output**: Kết quả PASS từ `checklist.py`.
- **Verify**: Lệnh `python3 .agent/scripts/checklist.py .` thành công.
