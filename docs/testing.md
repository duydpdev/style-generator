# Testing Guide

Tài liệu hướng dẫn về các phương pháp testing cho `fe-style-generator`.

## CI/CD Pipeline

Dự án sử dụng hệ thống kiểm tra 2 lớp để đảm bảo tính ổn định:

1. **Local (Pre-commit):** Sử dụng `Husky` và `lint-staged` để chạy `eslint`, `prettier`, `tsc` và `vitest` trước khi commit code.
2. **Remote (GitHub Actions):** Tự động chạy toàn bộ quy trình `lint` -> `build` -> `test` khi có PR hoặc push vào nhánh `main`/`develop`.

---

### Các loại Testing

#### 1. Unit Testing (Vitest)

Sử dụng **Vitest** để kiểm tra logic của các hàm helper và factories.

```bash
# Chạy tất cả unit tests
yarn test

# Chạy ở chế độ watch
yarn test:watch
```

**Các module chính được test:**

- `src/utils/*`: kebabCase, flattenToVars, resolveSpacing...
- `src/factories/*`: generateSafelist, createStyleSystem...

#### 2. Type Testing (Vitest Typecheck)

Đảm bảo TypeScript inference hoạt động chính xác. Kiểm tra mảng `DesignTokens` phản ánh đúng các mảng keys từ `theme.json`.

```bash
# Chạy kiểm tra types
yarn test:types
```

#### 3. Integration Testing

Kiểm tra sự phối hợp giữa plugin và Tailwind CSS build engine.

---

## Setup Môi Trường Test

Để thêm một file test mới:

1. Tạo file `${name}.test.ts` hoặc `${name}.test-d.ts` (cho type tests).
2. Viết test case sử dụng API của `vitest`.

Ví dụ Unit Test:

```typescript
import { expect, test } from "vitest";
import { toKebabCase } from "../utils/toKebabCase";

test("convert camelCase to kebab-case", () => {
  expect(toKebabCase("camelCase")).toBe("camel-case");
});
```

Ví dụ Type Test:

```typescript
import { assertType, test } from "vitest";
import { createDesignTokens } from "./createDesignTokens";

test("DesignTokens types", () => {
  const { DesignTokens } = createDesignTokens(
    { colors: { base: { p: "#000" } } } as const,
    {},
  );
  assertType<"p">(DesignTokens.Web.variantColor[0]);
});
```
