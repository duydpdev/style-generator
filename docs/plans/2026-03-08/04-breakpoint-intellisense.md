# Project Plan: Thêm gợi ý Breakpoint cho Responsive Spacing Props

## 🎯 Overview

Cập nhật type `ResponsiveValue` trong `spacingHelpers.ts` để cải thiện trải nghiệm Type Intellisense (gợi ý tự động của IDE) đối với các keys breakpoint.
Để nhận biết không chỉ các breakpoint tuỳ chỉnh truyền vào `StyleGeneratorOptions` mà còn các breakpoint tiêu chuẩn, chúng ta sẽ:

1. Cho phép `ResponsiveValue` nhận Generic Type tham chiếu tới danh sách breakpoint từ `DesignTokens` sinh ra bởi hàm `createDesignTokens`.
2. Tạo fallback mặc định là danh sách breakpoint chuẩn (base, sm, md, lg, xl, 2xl) cộng với trick `(string & {})` để IDE vẫn cho phép pass chuỗi bất kỳ mà không bắn lỗi Type Error, phòng khi dev chưa truyền Generic.

## 📱 Project Type

LIBRARY

## ✅ Success Criteria

1. Khi gọi prop `p` hoặc các spacing prop khác bằng dạng object: `p={{ ... }}`, VSCode sẽ tự động gợi ý các breakpoint chuẩn (base, md, lg...).
2. Nếu dự án có cấu hình breakpoint tuỳ chỉnh (vd `tablet`) và truyền Type đó vào `ResponsiveValue<number, MyBreakpoints>`, IDE sẽ gợi ý `base` + `tablet`.
3. Vẫn cho phép truyền các breakpoint custom dạng string mà không bị báo lỗi type error (nhờ `(string & {})`).

## 📋 Task Breakdown

### [ ] Task 1: Cập nhật file type cho ResponsiveValue

- **Agent**: frontend-specialist
- **Input**: `src/features/spacing/spacingHelpers.ts`, tham khảo `src/core/Options.ts` (để lấy enum `Breakpoint`)
- **Output**:
  - Khai báo kiểu `DefaultBreakpointKeys`:
    ```ts
    import type { Breakpoint } from "../../core/Options";
    export type DefaultBreakpointKeys = "base" | `${Breakpoint}`;
    ```
  - Sửa đổi `ResponsiveValue` chấp nhận Generic breakpoint:
    ```ts
    export type ResponsiveValue<
      T,
      BKeys extends string = DefaultBreakpointKeys,
    > = T | Partial<Record<BKeys | "base" | (string & {}), T>>;
    ```
- **Verify**: Component vẫn build tốt và VSCode có thể hiện gợi ý.

### [ ] Task 2: Kiểm tra lại toàn bộ project

- **Agent**: orchestrator
- **Input**: Lệnh kiểm tra `checklist.py`.
- **Output**: Vượt qua tất cả các kiểm tra.
- **Verify**: Kết quả script `python3 .agent/scripts/checklist.py .` trả về PASS.
