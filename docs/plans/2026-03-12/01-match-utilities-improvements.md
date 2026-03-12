# Kế hoạch dự án: matchUtilities & Cải thiện Plugin

## Tổng quan

Dựa trên phân tích Context7 docs (Catppuccin, Fluid TailwindCSS) và hiện trạng codebase, kế hoạch này đề xuất 4 cải tiến cho Tailwind plugin:

1. `matchUtilities` cho **Spacing** — tích hợp JIT thực sự
2. `matchUtilities` cho **Typography** — hỗ trợ dynamic variant
3. **Tailwind v4 `@plugin`** CSS-first support — chuẩn bị cho tương lai
4. **Đặt tên CSS variable** theo chuẩn Tailwind v4 — tự động nhận diện màu

---

## Loại dự án

LIBRARY

---

## Tiêu chí hoàn thành

1. Consumer có thể dùng `sp-p-4`, `sp-p-[24px]` với arbitrary value bên cạnh `.sp-p` hiện tại
2. Typography utilities hỗ trợ arbitrary/theme values qua `matchUtilities`
3. `@plugin "@duydpdev/style-generator"` hoạt động trong Tailwind v4 CSS config
4. Option `v4ColorNaming: true` tạo `--color-*` vars để Tailwind v4 tự động detect
5. Tất cả tests pass, không có breaking change ở v3

---

## Bối cảnh & Phân tích

### Hiện trạng

| Tính năng       | API hiện tại                              | Hạn chế                                                    |
| --------------- | ----------------------------------------- | ---------------------------------------------------------- |
| Spacing         | `addUtilities` → static `.sp-p`, `.sp-mx` | Phải khai báo trong safelist; không hỗ trợ arbitrary value |
| Typography      | `addUtilities` → static classes           | Tương tự spacing, tất cả pre-registered                    |
| Tailwind v4     | `plugin(creator, config)` dạng v3         | `@plugin` directive trong CSS chưa hoạt động               |
| Đặt tên CSS var | `--color-base-*`, `--color-text-*`        | v4 chỉ tự động detect namespace `--color-*`                |

### Tại sao `matchUtilities` tốt hơn `addUtilities` cho Spacing?

```
// Hiện tại (addUtilities) — static, phải có trong safelist:
.sp-p { padding: var(--tw-sp-p); }

// Sau khi cải tiến (matchUtilities) — JIT, on-demand:
.sp-p-4     { --sp-p: 1rem;   padding: var(--sp-p); }
.sp-p-[24px]{ --sp-p: 24px;   padding: var(--sp-p); }
.sp-p-8     { --sp-p: 2rem;   padding: var(--sp-p); }
```

Consumer không cần safelist cho spacing — Tailwind JIT tự scan HTML và generate.

---

## Chi tiết các Task

### [ ] Task 01: `matchUtilities` cho Spacing

- **Agent**: frontend-specialist (plugin/spacing domain)
- **Input**: `src/features/spacing/spacing.ts`, `src/core/Options.ts`
- **Output**:
  - Thêm `api.matchUtilities()` trong `generateSpacingRules` song song với `addUtilities` hiện tại
  - Consumer có thêm option `spacing.useMatchUtilities?: boolean` (default `false` để backward-compat)
  - Khi `true`: dùng `matchUtilities` với `values: api.theme('spacing')` + hỗ trợ arbitrary value
  - Giữ nguyên `.sp-{key}` static utility (CSS var chain responsive vẫn hoạt động)
- **Verify**: Test case `sp-p-4`, `sp-p-[20px]` generate đúng CSS; `.sp-p` vẫn hoạt động

**Chi tiết implementation:**

```typescript
// spacing.ts — thêm block này khi useMatchUtilities = true
for (const [key, cssProps] of Object.entries(spacingProps)) {
  api.matchUtilities(
    {
      [`sp-${key}`]: (value: string) => {
        const overrides: Record<string, string> = {
          [`--sp-${key}`]: value,
        };
        for (const cssProp of Object.keys(cssProps)) {
          overrides[cssProp] = `var(--sp-${key})`;
        }
        return overrides;
      },
    },
    {
      values: api.theme("spacing"),
      supportsNegativeValues: false,
    },
  );
}
```

---

### [ ] Task 02: `matchUtilities` cho Typography

- **Agent**: frontend-specialist
- **Input**: `src/features/plugin/createStylePlugin.ts`, `src/core/ThemeConfig.ts`
- **Output**:
  - Refactor `addUtilities(addDot(typography))` sang `matchUtilities` để hỗ trợ theme values
  - Typography class với modifier: `text-{name}` sử dụng typography token
  - Option `typography.useMatchUtilities?: boolean` (default `false`)
- **Verify**: Typography class vẫn generate đúng CSS properties; arbitrary modifier hoạt động

**Chi tiết implementation:**

```typescript
// Thay vì:
api.addUtilities(addDot(typography));

// Thêm matchUtilities variant:
for (const [name, styles] of Object.entries(typography)) {
  api.matchUtilities(
    { [name]: (_value) => styles as Record<string, string> },
    { values: { DEFAULT: name } },
  );
}
```

> Lưu ý: Typography hiện tại là multi-property classes (font-size, line-height, ...) nên `matchUtilities` sẽ dùng value làm modifier, giữ nguyên style object.

---

### [ ] Task 03: Tailwind v4 `@plugin` CSS-first Support

- **Agent**: frontend-specialist
- **Input**: `src/index.ts`, `src/features/plugin/createStylePlugin.ts`, `package.json`
- **Output**:
  - Export thêm `createStylePluginV4` hoặc unified factory tự detect v3/v4
  - Thêm subpath export `/plugin-v4` trong `package.json` `exports` field
  - V4 plugin format: không nhận `tailwindConfig` object, chỉ nhận `addBase`/`addUtilities` API
  - Consumer dùng: `@plugin "@duydpdev/style-generator/plugin-v4"`
- **Verify**: Import v4 plugin vào CSS file, `@plugin` directive resolve đúng; v3 format không bị ảnh hưởng

**Tham khảo (từ Fluid TailwindCSS docs):**

```css
/* Cách dùng ở phía consumer v4 */
@import "tailwindcss";
@plugin "@duydpdev/style-generator";
```

**Điểm khác biệt của v4 plugin format so với v3:**

```typescript
// v4: không có tailwindConfig wrapper, chỉ plugin creator
export const createStylePluginV4 = (
  config: ThemeConfig,
  options?: StyleGeneratorOptions,
) => {
  return (api: PluginAPI) => {
    // addBase, addUtilities, matchUtilities — logic giống v3
    // KHÔNG có: theme.extend (v4 dùng CSS-first config thay thế)
  };
};
```

---

### [ ] Task 04: Đặt tên CSS Variable cho Tailwind v4 Auto-detection

- **Agent**: frontend-specialist
- **Input**: `src/features/plugin/cssVariables.ts`, `src/features/plugin/createStylePlugin.ts`
- **Output**:
  - Thêm option `v4ColorNaming?: boolean` (default `false`) trong `StyleGeneratorOptions`
  - Khi `true`: `flattenToVars` tạo `--color-{name}` thay vì `--color-base-{name}` / `--color-text-{name}`
  - Tailwind v4 tự động detect và generate `text-primary`, `bg-primary` không cần `theme.extend.colors`
  - V3 behavior giữ nguyên khi `v4ColorNaming = false`
- **Verify**: `--color-primary` được inject vào `:root`; Tailwind v4 generate `text-primary` tự động

**Tham khảo (từ Catppuccin TailwindCSS docs — v4 approach):**

```css
/* Catppuccin v4: --color-ctp-* → tự generate text-ctp-*, bg-ctp-* */
:root {
  --color-primary: #007aff; /* v4 tự động detect namespace --color-* */
}
```

**Bảng đổi tên khi `v4ColorNaming: true`:**

| Hiện tại                | Sau khi bật (`v4ColorNaming: true`)         |
| ----------------------- | ------------------------------------------- |
| `--color-base-primary`  | `--color-primary`                           |
| `--color-text-muted`    | `--color-text-muted` (giữ namespace "text") |
| `--color-common-accent` | `--color-accent`                            |

> Quyết định: chấp nhận giữ namespace "text-" vì `--color-text-*` vẫn hợp lệ trong v4. Flatten namespace "base" và "common".

---

## Thứ tự thực hiện & Rủi ro

| Task                           | Effort | Rủi ro     | Breaking?        | Ưu tiên    |
| ------------------------------ | ------ | ---------- | ---------------- | ---------- |
| 01 - matchUtilities Spacing    | Medium | Thấp       | Không (opt-in)   | Cao        |
| 04 - v4 Color Naming           | Low    | Thấp       | Không (opt-in)   | Cao        |
| 02 - matchUtilities Typography | Low    | Thấp       | Không (opt-in)   | Trung bình |
| 03 - v4 @plugin Support        | High   | Trung bình | Không (additive) | Thấp       |

**Thứ tự đề xuất**: 01 → 04 → 02 → 03

---

## Ghi chú

- Tất cả cải tiến đều opt-in (flag trong `StyleGeneratorOptions`) để đảm bảo zero breaking change
- Task 01 và 02 là additive — `addUtilities` static vẫn hoạt động song song
- Task 03 cần nghiên cứu thêm Tailwind v4 plugin API changes trước khi implement
- Task 04 là đơn giản nhất về implementation, impact lớn nhất với v4 users
