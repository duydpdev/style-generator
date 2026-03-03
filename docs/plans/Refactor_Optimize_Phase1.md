# Plan: Refactor + Optimize Phase 1

> Trạng thái: Ready for Review  
> Ưu tiên: Readability / Maintainability  
> Ràng buộc: Không thêm test framework. Verify bằng lint + build + fixture thủ công.

---

## Mục tiêu

1. Giảm cognitive load khi đọc `createStylePlugin.ts` (file lớn nhất, 214 dòng, ôm 4 trách nhiệm).
2. Gom logic CSS vars build đang trùng pattern giữa `buildLightVars` / `buildThemeVars`.
3. Thống nhất color class generation trong `generateSafelist` (đang dùng 2 pattern khác nhau).
4. Bỏ return `unknown` ở public API.
5. Đồng bộ docs theo code thực tế.

## Nguyên tắc

- Refactor từng bước nhỏ, mỗi bước lint + build lại.
- Không đổi runtime output. Public API signatures giữ backward-compatible.
- Không tạo abstraction layer cho logic chỉ dùng 1 chỗ.

---

## Step 1: Baseline

**Hành động**: Chạy `yarn lint` + `yarn build`, chốt trạng thái trước refactor.

- [ ] `yarn lint` pass
- [ ] `yarn build` pass

---

## Step 2: Tách spacing logic ra khỏi `createStylePlugin.ts`

**File sửa**: `src/factories/createStylePlugin.ts`  
**File mới**: `src/factories/spacing.ts`

**Lý do**: Spacing chiếm ~50 dòng (L60-L135) gồm `buildFallbackChain` + `generateSpacingRules`, là khối logic độc lập có thể tách sạch.

**Di chuyển**:

```
buildFallbackChain()    → src/factories/spacing.ts
generateSpacingRules()  → src/factories/spacing.ts
```

**createStylePlugin.ts sau khi tách**: chỉ còn orchestration:

```ts
// createStylePlugin.ts (sau refactor)
import { generateSpacingRules } from "./spacing";

export const createStylePlugin = (config, options, safelist?) => {
  // 1. Build tailwind config (colors, shadows, screens, safelist)
  // 2. Plugin callback:
  //    a. Inject CSS vars (buildVars inline, ~30 dòng)
  //    b. Register typography
  //    c. generateSpacingRules(api, options, screens)
  // 3. Return plugin(myPlugin, tailwindConfig)
};
```

**Checklist**:

- [ ] Tạo `src/factories/spacing.ts` với `buildFallbackChain` + `generateSpacingRules`
- [ ] Import ngược lại trong `createStylePlugin.ts`
- [ ] `yarn lint` + `yarn build` pass
- [ ] CSS output spacing không đổi

---

## Step 3: Gom `buildLightVars` + `buildThemeVars` thành 1 hàm

**File sửa**: `src/factories/createStylePlugin.ts`

**Hiện tại** (2 hàm gần giống nhau):

```ts
// buildLightVars — bắt buộc colors, optional shadows/backdrop/radius
const buildLightVars = (config: ThemeConfig) => ({
  ...flattenToVars("color-base", colors.base),
  ...flattenToVars("color-text", colors.text),
  ...(shadows ? flattenToVars("shadow", shadows) : {}),
  ...(backDropBlurs ? flattenToVars("backdrop-blur", backDropBlurs) : {}),
  ...(borderRadius ? flattenToVars("radius", borderRadius) : {}),
});

// buildThemeVars — tất cả optional
const buildThemeVars = (override: ThemeOverride) => ({
  ...(override.colors?.base
    ? flattenToVars("color-base", override.colors.base)
    : {}),
  ...(override.colors?.text
    ? flattenToVars("color-text", override.colors.text)
    : {}),
  ...(override.shadows ? flattenToVars("shadow", override.shadows) : {}),
  ...(override.backDropBlurs
    ? flattenToVars("backdrop-blur", override.backDropBlurs)
    : {}),
  ...(override.borderRadius
    ? flattenToVars("radius", override.borderRadius)
    : {}),
});
```

**Sau** (1 hàm duy nhất):

```ts
type VarSource = {
  colors?: { base?: Record<string, string>; text?: Record<string, string> };
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
};

const buildCssVars = (source: VarSource): Record<string, string> => ({
  ...(source.colors?.base
    ? flattenToVars("color-base", source.colors.base)
    : {}),
  ...(source.colors?.text
    ? flattenToVars("color-text", source.colors.text)
    : {}),
  ...(source.shadows ? flattenToVars("shadow", source.shadows) : {}),
  ...(source.backDropBlurs
    ? flattenToVars("backdrop-blur", source.backDropBlurs)
    : {}),
  ...(source.borderRadius ? flattenToVars("radius", source.borderRadius) : {}),
});
```

**Usage sau refactor**:

```ts
// Base theme
api.addBase({ ":root": buildCssVars(config) });

// Theme overrides
for (const [name, override] of Object.entries(config.themes)) {
  const vars = buildCssVars(override);
  if (Object.keys(vars).length > 0) {
    api.addBase({ [`html[data-theme='${name}']`]: vars });
  }
}
```

**Checklist**:

- [ ] Xóa `buildLightVars` + `buildThemeVars`, thay bằng `buildCssVars`
- [ ] Update usage trong `myPlugin` callback
- [ ] `yarn lint` + `yarn build` pass
- [ ] CSS vars output cho `:root` và `data-theme` không đổi

---

## Step 4: Thống nhất color class generation trong `generateSafelist.ts`

**File sửa**: `src/factories/generateSafelist.ts`

**Hiện tại**: Color classes dùng pattern riêng (`generateColorClasses` inline), không dùng `pushClasses` helper như các module khác.

```ts
// L120-L134: pattern riêng, không dùng pushClasses
const generateColorClasses = (prefix: string) => {
  if (prefix && !responsiveModules.includes("colors" as never)) return;
  colorKeys.forEach((color) => {
    safelist.push(
      `${prefix}text-${color}`,
      `${prefix}bg-${color}`,
      `${prefix}border-${color}`,
    );
  });
};
generateColorClasses("");
for (const prefix of responsivePrefixes) {
  generateColorClasses(prefix);
}
```

**Sau**: Dùng `pushClasses` nhất quán, tách 3 lời gọi rõ ràng:

```ts
pushClasses("colors", ["text"], colorKeys);
pushClasses("colors", ["bg"], colorKeys);
pushClasses("colors", ["border"], colorKeys);
```

**Checklist**:

- [ ] Xóa `generateColorClasses` inline function
- [ ] Thay bằng 3 lời gọi `pushClasses`
- [ ] Verify color classes output không đổi (số lượng + nội dung)
- [ ] `yarn lint` + `yarn build` pass

---

## Step 5: Siết return type, bỏ `unknown`

**File sửa**: `src/factories/createStylePlugin.ts`, `src/factories/createStyleSystem.ts`

**Hiện tại**:

```ts
// createStylePlugin.ts L146
export const createStylePlugin = (...): unknown => { ... }

// createStyleSystem.ts L24
plugin: unknown;
```

**Sau**: Dùng type alias rõ nghĩa:

```ts
// src/types/index.ts hoặc Options.ts — thêm type alias
import type { Config } from "tailwindcss/types/config";
export type TailwindPlugin = { handler: (...args: unknown[]) => void; config?: Partial<Config> };

// createStylePlugin.ts
export const createStylePlugin = (...): TailwindPlugin => { ... }

// createStyleSystem.ts
plugin: TailwindPlugin;
```

> Nếu `tailwindcss/types/config` không export được type phù hợp (TW v3 vs v4), dùng:
> `export type TailwindPlugin = ReturnType<typeof plugin>;` lấy từ `tailwindcss/plugin`.

**Checklist**:

- [ ] Xác định type phù hợp từ tailwindcss exports
- [ ] Thêm type alias
- [ ] Cập nhật return types ở `createStylePlugin` và `createStyleSystem`
- [ ] `yarn lint` + `yarn build` pass
- [ ] Consumer vẫn dùng plugin không lỗi

---

## Step 6: Siết `object` type trong utils

**File sửa**: `src/utils/helpers.ts`

**Hiện tại**:

```ts
// extractData và addDot nhận `object` — quá rộng
export const extractData = (object: object, isToKebabCase = true) => { ... }
export const addDot = (object: object) => { ... }
```

**Sau**: Siết sang `Record<string, string>` hoặc `Record<string, unknown>` tùy usage:

```ts
export const extractData = (
  data: Record<string, string>,
  isToKebabCase = true,
): Record<string, string> => { ... }

export const addDot = (
  data: Record<string, Record<string, string | string[]>>,
): Record<string, Record<string, string | string[]>> => { ... }
```

**Checklist**:

- [ ] Đổi param type cho `extractData`
- [ ] Đổi param type cho `addDot`
- [ ] Bổ sung return types tường minh
- [ ] `yarn lint` + `yarn build` pass

---

## Step 7: Đồng bộ docs

**Files sửa**: `docs/architecture.md`, `docs/guide.md`, `docs/testing.md`

**architecture.md**:

- [ ] Cập nhật source structure: thêm `src/factories/spacing.ts`
- [ ] Cập nhật mô tả `createStylePlugin` (vai trò orchestration)

**guide.md**:

- [ ] Cập nhật danh sách spacing properties khớp `DEFAULT_SPACING_PROPERTIES`
  - Hiện tại guide liệt kê: `w`, `h`, `min-w`, `min-h`, `max-w`, `max-h` — nhưng constants không có
  - Cần bỏ hoặc ghi rõ "chưa có trong defaults, cần config thêm"
- [ ] Cập nhật type signatures nếu step 5 thay đổi

**testing.md**:

- [ ] Cập nhật strategy theo hướng không Vitest
- [ ] Bổ sung manual verification checklist

**Checklist chung**:

- [ ] Docs khớp code thực tế
- [ ] Không có snippet/example dùng API cũ

---

## Step 8: Verify cuối

- [ ] `yarn lint` pass
- [ ] `yarn build` pass
- [ ] Review output safelist trên `examples/theme.json` không thay đổi
- [ ] Review `DesignTokens.Web` keys trên `examples/theme.json` không thay đổi
- [ ] Review CSS vars shape cho `:root` và `data-theme` không thay đổi
- [ ] TypeScript compile không có lỗi mới

---

## Tóm tắt thay đổi theo file

| File                                   | Hành động                                                    |
| -------------------------------------- | ------------------------------------------------------------ |
| `src/factories/spacing.ts`             | **Mới** - nhận `buildFallbackChain` + `generateSpacingRules` |
| `src/factories/createStylePlugin.ts`   | Tách spacing, gom vars builder, siết return type             |
| `src/factories/generateSafelist.ts`    | Thống nhất color classes dùng `pushClasses`                  |
| `src/factories/createStyleSystem.ts`   | Siết `plugin` type                                           |
| `src/utils/helpers.ts`                 | Siết param/return types                                      |
| `src/types/Options.ts` hoặc `index.ts` | Thêm `TailwindPlugin` type alias                             |
| `docs/architecture.md`                 | Cập nhật structure + mô tả                                   |
| `docs/guide.md`                        | Sửa spacing list + type signatures                           |
| `docs/testing.md`                      | Cập nhật strategy                                            |

---

## Update Log

- 2026-03-03 (v1): Khởi tạo plan, chốt không Vitest.
- 2026-03-03 (v2): Chi tiết hóa theo file, thêm from/to và checklist.
- 2026-03-03 (v3): Đánh giá lại và clean plan.
  - Bỏ over-engineering: không tạo 4 file internal (chỉ tách 1 file `spacing.ts`).
  - Bỏ shared token extraction layer (không đáng abstract cho vài dòng `Object.keys`).
  - Thêm code snippets cụ thể cho mỗi thay đổi.
  - Gom checklist, bỏ lặp.
  - Bổ sung bảng tóm tắt file changes.
