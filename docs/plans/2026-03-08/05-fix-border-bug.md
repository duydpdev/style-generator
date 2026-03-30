# Project Plan: Fix lỗi generate border-4

## 🎯 Overview

Trong quá trình generate safelist cho các class border, khi cấu hình `border` trong options không được thiết lập, hệ thống đang fallback về `DEFAULT_BORDER_VALUES` (thuộc kiểu Array `[0, 1, 2, 4]`).
Vấn đề nằm ở đoạn lệnh: `Object.keys(border ?? DEFAULT_BORDER_VALUES)`.
Nếu gọi `Object.keys` đối với một mảng `[0, 1, 2, 4]`, kết quả trả về sẽ là danh sách các index của mảng: `["0", "1", "2", "3"]`.
Vì vậy, hệ thống sinh ra safelist `border-0`, `border-1`, `border-2`, `border-3`, nhưng bị thiếu mất `border-4`, dẫn tới lỗi không ăn CSS cho border-4.

Giải pháp: Chỉ gọi `Object.keys` đối với đối tượng cấu hình `border`. Nếu không tồn tại `border`, ta truyền trực tiếp giá trị của `DEFAULT_BORDER_VALUES`.

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. Code sinh ra phải chứa `border-4` (và `-0`, `-1`, `-2`).
2. Script sinh safelist phải xử lý logic `(border ? Object.keys(border) : DEFAULT_BORDER_VALUES)`.
3. Pass toàn bộ test sau khi sửa (đặc biệt là bài test generateSafelist.test).

## 📋 Task Breakdown

### [ ] Task 1: Cập nhật file generateSafelist.ts

- **Agent**: frontend-specialist
- **Input**: `src/features/safelist/generateSafelist.ts`
- **Output**:
  - Tại đoạn sinh `// --- 3. Border widths ---`, đổi:
    ```ts
    const values =
      resolvedOptions.border?.values ??
      Object.keys(border ?? DEFAULT_BORDER_VALUES);
    ```
    Thành:
    ```ts
    const values =
      resolvedOptions.border?.values ??
      (border ? Object.keys(border) : DEFAULT_BORDER_VALUES);
    ```
- **Verify**: Kiểm tra lại unit test và gọi lệnh run.

### [ ] Task 2: Cập nhật và chạy tất cả project checks

- **Agent**: orchestrator
- **Input**: Lệnh kiểm tra `checklist.py` và `vitest`.
- **Output**: Vượt qua tất cả các kiểm tra.
- **Verify**: Kết quả script `python3 .agent/scripts/checklist.py .` trả về PASS.
