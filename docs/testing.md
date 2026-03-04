# Testing Guide

Tài liệu hướng dẫn về các phương pháp testing cho `fe-style-generator`.

## Trạng thái hiện tại

> [!NOTE]
> Test framework **chưa được setup** (không có script `test` trong `package.json`). Hiện tại testing được thực hiện thủ công thông qua consumer project. Xem phần [Roadmap](#roadmap) bên dưới.

---

## Test Strategies (Kế hoạch)

### Unit Testing

Test cho các hàm tiện ích và helper functions:

- **`toKebabCase`** — chuyển đổi chuỗi sang kebab-case (bao gồm edge cases: số, capitalize, camelCase)
- **`resolveSpacing`** / **`resolveSpacingProps`** — map prop values sang CSS variables
- **`flattenToVars`** — flatten object thành CSS variable declarations
- **`buildFallbackChain`** — sinh `var()` fallback chains đúng thứ tự (mobile-first)

**Target file:** `src/utils/`, `src/factories/`

---

### Integration Testing

Test toàn bộ output của factory functions:

- **`createStyleSystem(theme, options)`** → kiểm tra `plugin` và `safelist` đúng cấu trúc
- **`generateSafelist(theme, options)`** → kiểm tra danh sách class names theo từng module và options
- **`createDesignTokens(theme, options)`** → kiểm tra `DesignTokens.Web.*` chứa đúng keys từ theme
- Feature flags: `enableCssVariables: false` → không inject CSS variables; `enableResponsive: false` → không sinh responsive rules

---

### Consumer Testing (Thủ công — hiện tại)

Test với project consumer thực tế (ví dụ `test-style-lib`, `fe-component-lib`):

1. **Build thư viện:** `yarn build`
2. **Link vào consumer:** dùng `yalc` hoặc `yarn link`
3. **Chạy Tailwind build trong consumer** → kiểm tra CSS output
4. **Kiểm tra TypeScript types:**

```typescript
// test-type.ts trong consumer
import { createDesignTokens } from "@duydpdev/style-generator";
import theme from "./theme.json";

const { DesignTokens } = createDesignTokens(theme as const, {});

// TS phải báo lỗi dòng này:
const color: (typeof DesignTokens.Web.variantColor)[number] = "invalid-color";
// → Error: Type '"invalid-color"' is not assignable to type '"primary" | "white" | ...
```

---

## Chạy Checks Hiện Tại

Mặc dù chưa có unit tests, các checks sau vẫn được chạy trong CI:

```bash
# Lint
yarn lint

# Build (TypeScript compile + Vite bundle)
yarn build
```

---

## Roadmap

**TODO:** Thiết lập test framework:

- [ ] Thêm test framework (khuyến nghị: **Vitest**)

  ```bash
  yarn add -D vitest
  ```

- [ ] Thêm script `"test": "vitest run"` vào `package.json`
- [ ] Thêm script `"test:watch": "vitest"` cho development
- [ ] Viết unit tests cho `src/utils/`
- [ ] Viết integration tests cho `src/factories/`
- [ ] Thêm `yarn test` vào CI workflow (`ci.yml`)
