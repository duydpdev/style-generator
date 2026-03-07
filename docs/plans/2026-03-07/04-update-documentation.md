# Project Plan: Cập nhật tài liệu và CLI Information

## 🎯 Overview

Cập nhật toàn bộ tài liệu (README, docs/\*.md) và thông tin CLI để phản ánh các thay đổi mới nhất từ các plan 01, 02 và 03 (Hybrid Theme, CI Pipeline, Husky, Vitest Typecheck).

## 📱 Project Type

LIBRARY (Documentation)

## ✅ Success Criteria

1. `README.md` phản ánh hệ thống Hybrid Theme (base, text, common) và Nested Colors.
2. `README.md` cập nhật đầy đủ thông tin về CI/CD và Type Testing.
3. `docs/testing.md` hướng dẫn đầy đủ về Husky và Vitest Typecheck.
4. `docs/guide.md` có ví dụ chuyên sâu về Nested Tokens và Shadcn UI mapping.
5. Lệnh CLI được cập nhật thông tin hỗ trợ nếu cần.

## 📋 Task Breakdown

### [x] Task 1: Cập nhật README.md

- **Agent**: `frontend-specialist`
- **Input**: `README.md`
- **Output**: Bổ sung phần "Hybrid Theme", "Development & CI", "Type Testing" và cập nhật ví dụ `theme.json`.
- **Verify**: Kiểm tra thủ công định dạng Markdown.

### [x] Task 2: Cập nhật docs/testing.md

- **Agent**: `frontend-specialist`
- **Input**: `docs/testing.md`
- **Output**: Thêm chi tiết về Unit Tests, Type Tests (Vitest) và quy trình CI 2 lớp.
- **Verify**: Đảm bảo các lệnh `yarn test`, `yarn test:types` chính xác.

### [x] Task 3: Cập nhật docs/guide.md

- **Agent**: `frontend-specialist`
- **Input**: `docs/guide.md`
- **Output**: Bổ sung hướng dẫn cấu hình theme nâng cao với Nested Keys và key `DEFAULT`.
- **Verify**: Kiểm tra tính chính xác của ví dụ code.

### [x] Task 4: Đồng bộ hóa Project Management

- **Agent**: `orchestrator`
- **Input**: `docs/plans/2026-03-07/task.md`
- **Output**: Thêm task 4 vào danh sách và cập nhật trạng thái.
- **Verify**: File cập nhật đúng thứ tự.
