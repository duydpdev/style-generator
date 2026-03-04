# Plan: Runtime Theme Validation

> **Trạng thái: Draft** _(2026-03-04)_  
> **Ưu tiên: Cao** — giúp user debug config sai nhanh chóng  
> **Phụ thuộc: Không** — có thể implement độc lập với cấu trúc colors hiện tại (`base` + `text`), sau đó mở rộng khi Flexible Colors lands

**Ghi chú dependency**: Validation ban đầu chỉ cần validate `colors.base` + `colors.text` (cấu trúc hiện tại). Khi Flexible_Colors_Architecture được implement, thêm validation cho dynamic color groups — đây là thay đổi nhỏ (thêm loop iterate `Object.entries(colors)`).

---

## Bối cảnh & Vấn đề

### Hiện tại: Không có validation

Khi user truyền theme config sai, không có error message rõ ràng:

```typescript
// Typo: "colour" thay vì "colors"
const theme = { colour: { base: { primary: "#007AFF" } } };
createStyleSystem(theme as any);
// → Runtime error: "Cannot read properties of undefined (reading 'base')"
// User không biết sai ở đâu
```

```typescript
// Thiếu field bắt buộc: typography
const theme = { colors: { base: { primary: "#007AFF" }, text: {} } };
createStyleSystem(theme as any);
// → TypeError somewhere deep in addUtilities
```

```typescript
// Giá trị sai type: fontSize là number thay vì string
const theme = {
  colors: { base: {}, text: {} },
  typography: {
    body: {
      fontSize: 16,
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
};
// → CSS output sai nhưng không báo lỗi
```

### Mục tiêu

1. Validate theme config ở runtime với error message rõ ràng, human-readable
2. Validate sớm nhất có thể (trước khi bất kỳ logic nào chạy)
3. Không tăng bundle size đáng kể cho production
4. Không thêm required dependency nặng

---

## Phân tích: Chọn validation approach

### Option A: Zod / Valibot

|                    | Zod                  | Valibot              |
| ------------------ | -------------------- | -------------------- |
| **Bundle size**    | ~14KB min+gzip       | ~6KB min+gzip        |
| **Tree-shaking**   | Tốt                  | Rất tốt (modular)    |
| **TS integration** | Infer type từ schema | Infer type từ schema |
| **Error messages** | Tốt                  | Tốt                  |
| **Popularity**     | Rất cao              | Đang tăng            |

**Vấn đề**: Thêm runtime dependency cho một lib generator → tăng install size cho consumer.

### Option B: Custom validation (không dependency)

Viết validation functions thủ công với error messages rõ ràng.

**Ưu điểm**:

- Zero dependency thêm
- Kiểm soát hoàn toàn error message format
- Bundle size rất nhỏ (~1-2KB)

**Nhược điểm**:

- Phải tự viết và maintain validation logic
- Không có schema reuse như Zod

### Option C: Hybrid — Custom validation + Optional Zod schema export

- Core lib dùng custom validation (zero dependency)
- Export Zod schema dưới sub-path `@duydpdev/style-generator/schema` cho user muốn dùng trong pipeline riêng

### Quyết định: **Option B** (Custom validation)

**Lý do**:

1. Lib này là build-time tool, validation logic đơn giản (check required keys + value types)
2. Không muốn thêm dependency cho consumer
3. Error messages cần custom theo context cụ thể của lib (không phải generic Zod messages)
4. Schema không quá phức tạp — ~100 dòng validation code là đủ

---

## Thiết kế Validation

### Validation module

```
src/
├── validation/
│   ├── index.ts
│   ├── validateTheme.ts      # Main validation function
│   └── errors.ts             # Error formatting utilities
```

### API

```typescript
import { validateTheme, ValidationError } from "@duydpdev/style-generator";

// Throws nếu invalid
validateTheme(config);

// Hoặc dùng safe version (không throw)
const result = validateTheme(config, { throwOnError: false });
if (!result.valid) {
  console.error(result.errors);
}
```

### Tích hợp vào factories

```typescript
// createStyleSystem.ts
export const createStyleSystem = <T extends ThemeConfig>(
  config: T,
  options?: StyleGeneratorOptions,
) => {
  // Validate ngay đầu tiên
  validateTheme(config);

  // ... logic hiện tại
};
```

Tương tự cho `createStylePlugin`, `generateSafelist`, `createDesignTokens`.

---

## Chi tiết Validation Rules

### Level 1: Structure validation (bắt buộc)

```typescript
interface ValidationRule {
  path: string;
  check: (value: unknown) => boolean;
  message: string;
}
```

| Path          | Rule                     | Error message                                     |
| ------------- | ------------------------ | ------------------------------------------------- |
| `colors`      | Required, phải là object | `"colors" is required and must be an object`      |
| `colors.base` | Required, phải là object | `"colors.base" is required and must be an object` |
| `colors.text` | Required, phải là object | `"colors.text" is required and must be an object` |
| `typography`  | Required, phải là object | `"typography" is required and must be an object`  |

### Level 2: Value type validation

| Path                         | Rule                                    | Error message                                                                        |
| ---------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------ |
| `colors.base.*`              | Mỗi value phải là string                | `"colors.base.{key}" must be a string (got {typeof value})`                          |
| `colors.text.*`              | Mỗi value phải là string                | `"colors.text.{key}" must be a string (got {typeof value})`                          |
| `colors.{group}.*`           | Mỗi value phải là string                | `"colors.{group}.{key}" must be a string (got {typeof value})`                       |
| `typography.*`               | Mỗi value phải là object với đúng shape | `"typography.{key}" must have: fontSize, lineHeight, fontWeight, letterSpacing`      |
| `typography.*.fontSize`      | Phải là string                          | `"typography.{key}.fontSize" must be a string (e.g. "16px"), got {typeof value}`     |
| `typography.*.lineHeight`    | Phải là string                          | `"typography.{key}.lineHeight" must be a string (e.g. "150%"), got {typeof value}`   |
| `typography.*.fontWeight`    | Phải là number                          | `"typography.{key}.fontWeight" must be a number, got {typeof value}`                 |
| `typography.*.letterSpacing` | Phải là string                          | `"typography.{key}.letterSpacing" must be a string (e.g. "0px"), got {typeof value}` |
| `shadows.*`                  | Mỗi value phải là string                | `"shadows.{key}" must be a string`                                                   |
| `backDropBlurs.*`            | Mỗi value phải là string                | `"backDropBlurs.{key}" must be a string`                                             |
| `borderRadius.*`             | Mỗi value phải là string                | `"borderRadius.{key}" must be a string`                                              |

### Level 3: Theme override validation

| Path              | Rule                                        | Error message                                                 |
| ----------------- | ------------------------------------------- | ------------------------------------------------------------- |
| `themes`          | Nếu có, phải là object                      | `"themes" must be an object if provided`                      |
| `themes.*`        | Mỗi value phải là object                    | `"themes.{name}" must be an object`                           |
| `themes.*.colors` | Nếu có, mỗi group phải là object of strings | `"themes.{name}.colors.{group}" must be an object of strings` |

### Level 4: Warnings (không throw, chỉ console.warn)

| Check              | Warning message                                                                    |
| ------------------ | ---------------------------------------------------------------------------------- |
| `colors.base` rỗng | `Warning: "colors.base" is empty — no base colors will be generated`               |
| `colors.text` rỗng | `Warning: "colors.text" is empty — no text colors will be generated`               |
| `typography` rỗng  | `Warning: "typography" is empty — no typography utilities will be generated`       |
| Tên key chứa space | `Warning: "{path}.{key}" contains spaces — this may cause issues with class names` |

> ~~Giá trị color không giống color format~~ — **ĐÃ LOẠI BỎ**. CSS color formats quá đa dạng (hex, rgb, rgba, hsl, oklch, named colors, CSS variables...). Regex check sẽ phức tạp và dễ false positive. Không đáng effort cho warning.

---

## Error Output Format

### Ví dụ: Thiếu required field

```
[style-generator] Theme validation failed:

  ✗ "colors" is required and must be an object
    at: theme config root

  Fix: Add a "colors" property with at least "base" and "text":

    {
      "colors": {
        "base": { "primary": "#007AFF" },
        "text": { "main": "#1C1C20" }
      },
      ...
    }
```

### Ví dụ: Sai value type

```
[style-generator] Theme validation failed:

  ✗ "typography.body.fontSize" must be a string (e.g. "16px"), got number
    at: typography.body.fontSize = 16

  Fix: Wrap the value in quotes:

    "body": {
      "fontSize": "16px",  ← string, not number
      ...
    }
```

### Ví dụ: Nhiều lỗi

```
[style-generator] Theme validation failed (3 errors):

  1. ✗ "colors.base.primary" must be a string (got number)
     at: colors.base.primary = 42

  2. ✗ "typography.heading" must have: fontSize, lineHeight, fontWeight, letterSpacing
     at: typography.heading = { "fontSize": "32px" }
     Missing: lineHeight, fontWeight, letterSpacing

  3. ✗ "themes.dark.colors.base" must be an object of strings
     at: themes.dark.colors.base = "invalid"
```

---

## Implementation

### `src/validation/errors.ts`

```typescript
export interface ValidationError {
  path: string;
  message: string;
  value?: unknown;
  fix?: string;
}

export class ThemeValidationError extends Error {
  errors: ValidationError[];

  constructor(errors: ValidationError[]) {
    const header =
      errors.length === 1
        ? "[style-generator] Theme validation failed:"
        : `[style-generator] Theme validation failed (${errors.length} errors):`;

    const body = errors
      .map((e, i) => {
        const prefix = errors.length > 1 ? `  ${i + 1}. ` : "  ";
        let msg = `${prefix}✗ ${e.message}`;
        if (e.path) msg += `\n     at: ${e.path}`;
        if (e.fix) msg += `\n     Fix: ${e.fix}`;
        return msg;
      })
      .join("\n\n");

    super(`${header}\n\n${body}\n`);
    this.name = "ThemeValidationError";
    this.errors = errors;
  }
}
```

### `src/validation/validateTheme.ts`

```typescript
export interface ValidateOptions {
  throwOnError?: boolean; // default: true
  warn?: boolean; // default: true (console.warn for non-critical issues)
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
}

export const validateTheme = (
  config: unknown,
  options: ValidateOptions = {},
): ValidationResult => {
  const { throwOnError = true, warn = true } = options;
  const errors: ValidationError[] = [];
  const warnings: string[] = [];

  // Level 1: Structure
  if (!isObject(config)) {
    errors.push({ path: "root", message: "Theme config must be an object" });
    return finalize(errors, warnings, throwOnError);
  }

  validateRequired(config, "colors", "object", errors);
  validateRequired(config, "typography", "object", errors);

  if (errors.length > 0) return finalize(errors, warnings, throwOnError);

  // Level 1b: colors sub-structure
  const colors = (config as Record<string, unknown>).colors as Record<
    string,
    unknown
  >;
  validateRequired(colors, "base", "object", errors);
  validateRequired(colors, "text", "object", errors);

  if (errors.length > 0) return finalize(errors, warnings, throwOnError);

  // Level 2: Value types
  validateColorGroup(colors, "base", errors, warnings, warn);
  validateColorGroup(colors, "text", errors, warnings, warn);

  // Dynamic color groups
  for (const [group, value] of Object.entries(colors)) {
    if (group === "base" || group === "text") continue;
    validateColorGroup(colors, group, errors, warnings, warn);
  }

  validateTypography((config as Record<string, unknown>).typography, errors);

  // Optional fields
  validateOptionalStringRecord(config, "shadows", errors);
  validateOptionalStringRecord(config, "backDropBlurs", errors);
  validateOptionalStringRecord(config, "borderRadius", errors);
  validateOptionalStringRecord(config, "border", errors);

  // Level 3: Theme overrides
  if ("themes" in (config as object)) {
    validateThemeOverrides((config as Record<string, unknown>).themes, errors);
  }

  // Level 4: Warnings
  if (warn) {
    checkEmptyWarnings(config as Record<string, unknown>, warnings);
  }

  return finalize(errors, warnings, throwOnError);
};
```

### Helper functions (complete sketch)

```typescript
// ---- Core helpers ----

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * Finalize validation: nếu có errors và throwOnError=true → throw.
 * Nếu có warnings và warn=true → console.warn.
 * Luôn trả về ValidationResult.
 */
const finalize = (
  errors: ValidationError[],
  warnings: string[],
  throwOnError: boolean,
): ValidationResult => {
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn(`[style-generator] ${w}`);
    }
  }

  if (errors.length > 0 && throwOnError) {
    throw new ThemeValidationError(errors);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
};

// ---- Field validators ----

const validateRequired = (
  obj: Record<string, unknown>,
  key: string,
  expectedType: "object" | "string",
  errors: ValidationError[],
) => {
  if (!(key in obj)) {
    errors.push({ path: key, message: `"${key}" is required` });
    return;
  }
  if (expectedType === "object" && !isObject(obj[key])) {
    errors.push({
      path: key,
      message: `"${key}" must be an object, got ${typeof obj[key]}`,
    });
  }
};

const validateColorGroup = (
  colors: Record<string, unknown>,
  group: string,
  errors: ValidationError[],
  warnings: string[],
  warn: boolean,
) => {
  const groupValue = colors[group];
  if (!isObject(groupValue)) return;

  const isEmpty = Object.keys(groupValue).length === 0;
  if (isEmpty && warn) {
    warnings.push(
      `"colors.${group}" is empty — no ${group} colors will be generated`,
    );
  }

  for (const [key, value] of Object.entries(groupValue)) {
    if (typeof value !== "string") {
      errors.push({
        path: `colors.${group}.${key}`,
        message: `"colors.${group}.${key}" must be a string (got ${typeof value})`,
        value,
      });
    }
    if (warn && typeof value === "string" && key.includes(" ")) {
      warnings.push(
        `"colors.${group}.${key}" contains spaces — this may cause class name issues`,
      );
    }
  }
};

const validateTypography = (typography: unknown, errors: ValidationError[]) => {
  if (!isObject(typography)) return;

  const requiredFields = [
    "fontSize",
    "lineHeight",
    "fontWeight",
    "letterSpacing",
  ];
  const fieldTypes: Record<string, string> = {
    fontSize: "string",
    lineHeight: "string",
    fontWeight: "number",
    letterSpacing: "string",
  };

  for (const [key, value] of Object.entries(typography)) {
    if (!isObject(value)) {
      errors.push({
        path: `typography.${key}`,
        message: `"typography.${key}" must be an object`,
        value,
      });
      continue;
    }

    const missing = requiredFields.filter((f) => !(f in value));
    if (missing.length > 0) {
      errors.push({
        path: `typography.${key}`,
        message: `"typography.${key}" must have: ${requiredFields.join(", ")}`,
        fix: `Missing: ${missing.join(", ")}`,
      });
      continue;
    }

    for (const [field, expectedType] of Object.entries(fieldTypes)) {
      if (field in value && typeof value[field] !== expectedType) {
        errors.push({
          path: `typography.${key}.${field}`,
          message: `"typography.${key}.${field}" must be a ${expectedType}, got ${typeof value[field]}`,
          value: value[field],
        });
      }
    }
  }
};

/**
 * Validate optional field — nếu có, phải là Record<string, string>.
 */
const validateOptionalStringRecord = (
  config: Record<string, unknown>,
  key: string,
  errors: ValidationError[],
) => {
  if (!(key in config)) return;
  const value = config[key];

  if (!isObject(value)) {
    errors.push({
      path: key,
      message: `"${key}" must be an object if provided, got ${typeof value}`,
    });
    return;
  }

  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== "string") {
      errors.push({
        path: `${key}.${k}`,
        message: `"${key}.${k}" must be a string (got ${typeof v})`,
        value: v,
      });
    }
  }
};

/**
 * Validate `themes` field — each theme override.
 */
const validateThemeOverrides = (themes: unknown, errors: ValidationError[]) => {
  if (!isObject(themes)) {
    errors.push({
      path: "themes",
      message: `"themes" must be an object if provided`,
    });
    return;
  }

  for (const [name, override] of Object.entries(themes)) {
    if (!isObject(override)) {
      errors.push({
        path: `themes.${name}`,
        message: `"themes.${name}" must be an object`,
      });
      continue;
    }

    // Validate colors in override
    if ("colors" in override && override.colors != null) {
      if (!isObject(override.colors)) {
        errors.push({
          path: `themes.${name}.colors`,
          message: `"themes.${name}.colors" must be an object`,
        });
      } else {
        for (const [group, groupValue] of Object.entries(
          override.colors as Record<string, unknown>,
        )) {
          if (groupValue == null) continue;
          if (!isObject(groupValue)) {
            errors.push({
              path: `themes.${name}.colors.${group}`,
              message: `"themes.${name}.colors.${group}" must be an object of strings`,
            });
            continue;
          }
          for (const [k, v] of Object.entries(groupValue)) {
            if (typeof v !== "string") {
              errors.push({
                path: `themes.${name}.colors.${group}.${k}`,
                message: `"themes.${name}.colors.${group}.${k}" must be a string (got ${typeof v})`,
                value: v,
              });
            }
          }
        }
      }
    }

    // Validate optional string records in override
    for (const field of ["shadows", "backDropBlurs", "borderRadius"] as const) {
      if (field in override) {
        validateOptionalStringRecord(
          override as Record<string, unknown>,
          field,
          errors,
        );
      }
    }
  }
};

/**
 * Check for empty fields → warn (không throw).
 */
const checkEmptyWarnings = (
  config: Record<string, unknown>,
  warnings: string[],
) => {
  const colors = config.colors as Record<string, unknown> | undefined;
  if (colors) {
    if (isObject(colors.base) && Object.keys(colors.base).length === 0) {
      warnings.push(
        `"colors.base" is empty — no base colors will be generated`,
      );
    }
    if (isObject(colors.text) && Object.keys(colors.text).length === 0) {
      warnings.push(
        `"colors.text" is empty — no text colors will be generated`,
      );
    }
  }

  const typography = config.typography;
  if (isObject(typography) && Object.keys(typography).length === 0) {
    warnings.push(
      `"typography" is empty — no typography utilities will be generated`,
    );
  }
};
```

---

## Tích hợp vào factories

### Quyết định: Mỗi public function gọi `validateTheme` trực tiếp

**Không dùng** internal/external split hay Symbol flag — quá phức tạp cho bài toán đơn giản này.

**Lý do**:

- Validation cost < 1ms (chỉ check vài object keys + typeof), không đáng optimize
- Mỗi factory (`createStyleSystem`, `createStylePlugin`, `generateSafelist`, `createDesignTokens`) đều có thể được gọi standalone → mỗi cái đều phải validate
- Khi gọi từ `createStyleSystem`, validation chạy 4 lần nhưng tổng cộng < 4ms → chấp nhận được
- Code đơn giản, dễ hiểu, dễ maintain

### Cách chèn

```typescript
// Mỗi public function — thêm 1 dòng ở đầu:
export const createStyleSystem = <T extends ThemeConfig>(
  config: T,
  options?,
) => {
  validateTheme(config);
  // ... logic hiện tại giữ nguyên
};

export const createStylePlugin = (config: ThemeConfig, options?, safelist?) => {
  validateTheme(config);
  // ... logic hiện tại giữ nguyên
};

export const generateSafelist = <T extends ThemeConfig>(
  config: T,
  options?,
) => {
  validateTheme(config);
  // ... logic hiện tại giữ nguyên
};

export const createDesignTokens = <T extends ThemeConfig>(
  config: T,
  options?,
) => {
  validateTheme(config);
  // ... logic hiện tại giữ nguyên
};
```

---

## Phần bổ sung: `validateOptions` (future scope)

> **Out of scope cho lần implement đầu** — ghi nhận ở đây để implement sau.

User cũng có thể truyền sai `StyleGeneratorOptions`:

```typescript
createStyleSystem(theme, {
  breakpoints: [123], // Phải là string, không phải number
  layout: "flex", // Phải là object { enabled?, values? }, không phải string
  screens: "800px", // Phải là Record<string, string>, không phải string
});
```

Hiện tại sẽ crash sâu bên trong hoặc sinh output sai im lặng.

**Plan riêng (future)**: Thêm `validateOptions(options)` với cùng pattern, gọi ở mỗi public function sau `validateTheme`. Scope nhỏ hơn theme validation — options chỉ có ~10 fields đơn giản.

---

## Tác động

### Bundle size

Custom validation: ~1-2KB min+gzip (ước tính ~100-150 dòng code).

### Performance

Validation chạy ở build time (khi Tailwind process plugin). Cost < 1ms, không ảnh hưởng.

### Breaking changes: Không

- Chỉ thêm validation — config đúng vẫn hoạt động y hệt
- Config sai trước đây crash với error khó hiểu, giờ crash với error rõ ràng

### File changes

| File                                  | Hành động                   |
| ------------------------------------- | --------------------------- |
| `src/validation/validateTheme.ts`     | **Mới**                     |
| `src/validation/errors.ts`            | **Mới**                     |
| `src/validation/index.ts`             | **Mới** — re-export         |
| `src/index.ts`                        | Thêm export validation      |
| `src/factories/createStyleSystem.ts`  | Thêm `validateTheme()` call |
| `src/factories/createStylePlugin.ts`  | Thêm `validateTheme()` call |
| `src/factories/generateSafelist.ts`   | Thêm `validateTheme()` call |
| `src/factories/createDesignTokens.ts` | Thêm `validateTheme()` call |

---

## Verification

- [ ] Config đúng → không throw, không warning
- [ ] Config thiếu `colors` → throw với message rõ ràng
- [ ] Config thiếu `colors.base` → throw
- [ ] Config thiếu `typography` → throw
- [ ] `typography.body.fontSize = 16` (number) → throw với fix suggestion
- [ ] `themes.dark.colors.base = "invalid"` → throw
- [ ] Config rỗng `colors.base: {}` → warning (không throw)
- [ ] Key có space → warning
- [ ] `validateTheme(config, { throwOnError: false })` → trả `{ valid: false, errors: [...] }`
- [ ] `yarn lint` + `yarn build` pass
- [ ] Bundle size tăng < 2KB

---

## Timeline ước tính

| Step                                             | Effort  |
| ------------------------------------------------ | ------- |
| Validation module (errors.ts + validateTheme.ts) | ~3h     |
| Tích hợp vào factories                           | ~1h     |
| Test manual các edge cases                       | ~1.5h   |
| Docs update                                      | ~0.5h   |
| **Tổng**                                         | **~6h** |
