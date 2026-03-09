# Project Plan: Fix Responsive Variables Issue

## 🎯 Overview

Giải quyết tình trạng responsive CSS variables (như `--sp-p-md`, `--sp-p-lg`) khi dùng chung với thẻ style inline và class `.sp-p` không hoạt động đúng kích thước màn hình theo kỳ vọng, vì Tailwind v4 plugin không sinh `@media` (và bản thân inline styles không hoạt động với logic media queries tự nhiên nếu cả 2 vars cùng được truyền).

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. Phân tích nguyên nhân gốc (Root Cause) qua Output dạng Debug Workflow.
2. Brainstorm các giải pháp để xử lý CSS Variables mapping theo Breakpoint mà không được dùng `@media` trong `addUtilities`.
3. Cập nhật Code để class `.sp-*` có thể sử dụng responsive một cách hoàn hảo.
4. Pass mọi testcase và chạy đúng trên UI.

## 📋 Task Breakdown

### [x] Task 1: Debug & Phân Tích Nguyên Nhân

- **Agent**: `orchestrator` / `frontend-specialist`
- **Output**: Báo cáo nguyên nhân gốc qua Chat UI định dạng `/debug` và `/brainstorm`.
- **Verify**: Rõ ràng tại sao Inline CSS vars đè nhau bất chấp Breakpoints.

### [x] Task 2: Implement Fix Tailwind Rule

- **Input**: `src/features/spacing/spacing.ts` hoặc các tính năng khác chịu trách nhiệm về class `.sp-*`
- **Output**: Generator thêm được rules phù hợp vào Global CSS (hoặc qua custom classes) mapping biến base sang biến breakpoint thông qua `@media` ở Layer Base/Components thay vì Utilities, HOẶC dùng container queries.
- **Verify**: Khi resize màn hình, giá trị của `.sp-p` phải được đổi sang biến `--sp-p-md` nếu màn hình ở form `md`.

### [x] Task 3: Cập Nhật Client Component (nếu cần)

- **Input**: Nếu fix ở Tailwind Plugin không đủ, cập nhật helper parse Object Resp sang Inline Styles.
- **Output**: Các component React hiển thị responsive tốt. (Task này đã được bao hàm bằng cách fix triệt để ở Core Library bằng `@media` root, không cần parser logic phức tạp ở client).
