# Project Plan: Fix Tailwind v4 addUtilities Error + Responsive Object Props

## 🎯 Overview

Sửa lỗi Tailwind v4 CSS-first reject `@media` bên trong `addUtilities`/`addBase` JS plugin API, đồng thời thiết kế lại cơ chế responsive spacing dựa trên Inline CSS Variables (thay vì gen safelist class).

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. Loại bỏ hoàn toàn `@media` khỏi JS plugin API → dist output sạch.
2. Responsive props (`p={{ md: 4, lg: 3 }}`) được xử lý bằng inline CSS variables tại React runtime.
3. Safelist không bị phình to.
4. Build, lint, test pass.

## 📋 Task Breakdown

### [x] Task 1: Loại bỏ `@media` khỏi `spacing.ts`

- **Input**: `src/features/spacing/spacing.ts`
- **Output**: Chỉ sinh flat utility classes (`.sp-p`, `.sp-mx`...) với CSS var fallback chain. Không có `@media` nào trong dist output.
- **Verify**: `grep -n "@media" dist/index.js` trả về rỗng.

### [ ] Task 2: Tạo Responsive CSS Variable Parser (Future)

- **Input**: Tạo helper function parse `{ md: 4, lg: 3 }` → `{ "--sp-p-md": "1rem", "--sp-p-lg": "0.75rem" }`.
- **Output**: Component Box/Flex sử dụng helper này để set inline style.
- **Note**: Đây là phần Component Layer, sẽ triển khai sau khi fix lỗi Tailwind v4 xong.

### [ ] Task 3: Publish bản mới và cập nhật test-shadcn

- **Input**: `npm publish` hoặc `yarn link` để test-shadcn dùng bản mới.
- **Output**: test-shadcn `yarn dev` chạy không lỗi.
