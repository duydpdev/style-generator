# Project Plan: Fix Tailwind Utility Generation For Vite

## 🎯 Overview

Sửa lỗi `addUtilities` selector không hợp lệ (lỗi "Utilities must be a single class name") khi kết hợp Tailwind v4 + Vite, do truyền `@media` vào root tier.

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. Hàm `generateSpacingRules` gom được `@media` query vào bên trong block definition của class.
2. Lỗi cấu hình Vite + Tailwind Plugin được khắc phục triệt để.
3. Chạy test `checklist.py` thành công.

## 📋 Task Breakdown

### [x] Task 1: Refactor `generateSpacingRules`

- **Agent**: frontend-specialist
- **Input**: `src/features/spacing/spacing.ts`
- **Output**: Gom các query `@media` vào bên trong object của từng utility key (ví dụ: `'.sp-p': { ..., '@media(...)': {...} }`).
- **Verify**: Type check và code lints không lỗi, build thư viện thành công.

### [x] Task 2: Verify & Checklist

- **Agent**: orchestrator
- **Input**: Toàn bộ dự án
- **Output**: Vượt qua quy trình kiểm tra cuối cùng.
- **Verify**: Chạy `python3 .agent/scripts/checklist.py .` trả về SUCCESS.
