# Plan: Flexible Colors Architecture

> **Trạng thái: Draft** _(2026-03-04)_  
> **Ưu tiên: Cao** — mở rộng khả năng biểu đạt cho design system  
> **Phụ thuộc: TypeScript_Inference_Plan.md** (type utilities cần update đồng bộ)

---

## Bối cảnh & Vấn đề

### Cấu trúc colors hiện tại

```typescript
// ThemeConfig.ts
colors: {
  base: Record<string, string>; // Cố định 2 nhóm
  text: Record<string, string>;
}
```

### Vấn đề

| #   | Vấn đề                                                              | Ví dụ thực tế                                                                                        |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | Chỉ có 2 nhóm color cố định (`base` + `text`)                       | Không thể thêm `surface`, `border`, `status`, `accent`                                               |
| 2   | User phải nhồi mọi color vào `base`                                 | `base: { primary, secondary, background, surface, error, success, warning }` — mất ý nghĩa phân nhóm |
| 3   | CSS variable prefix cứng nhắc                                       | Chỉ có `--color-base-*` và `--color-text-*`                                                          |
| 4   | Safelist color classes không linh hoạt                              | Chỉ gen `text-*`, `bg-*`, `border-*` cho keys từ `base` + `text`                                     |
| 5   | `DesignTokens` chỉ có `variantColor` (merged) và `variantTextColor` | Không thể lấy riêng nhóm `surface` hay `status`                                                      |

### Ví dụ use-case thực tế không hỗ trợ được

```json
{
  "colors": {
    "base": { "primary": "#007AFF", "secondary": "#5856D6" },
    "text": { "main": "#1C1C20", "muted": "#8E8E93" },
    "surface": { "default": "#FFFFFF", "elevated": "#F2F2F7" },
    "border": { "default": "#E5E5EA", "strong": "#C7C7CC" },
    "status": { "success": "#34C759", "error": "#FF3B30", "warning": "#FF9500" }
  }
}
```

Hiện tại, user buộc phải flatten tất cả vào `base`:

```json
{
  "colors": {
    "base": {
      "primary": "#007AFF",
      "secondary": "#5856D6",
      "surface-default": "#FFFFFF",
      "surface-elevated": "#F2F2F7",
      "border-default": "#E5E5EA",
      "error": "#FF3B30"
    },
    "text": { "main": "#1C1C20" }
  }
}
```

Mất đi tính phân nhóm có ý nghĩa của design system.

---

## Giải pháp: Dynamic color groups

### Nguyên tắc

1. **Backward compatible** — `{ base, text }` vẫn hoạt động y như cũ
2. **Additive** — thêm nhóm mới không ảnh hưởng nhóm cũ
3. **CSS variable prefix tự động** — `colors.surface.default` → `--color-surface-default`
4. **Safelist tự động** — tất cả color keys (mọi nhóm) đều sinh `text-*`, `bg-*`, `border-*`
5. **DesignTokens giữ được group info** — có thể lấy riêng từng nhóm

### ThemeConfig mới

> **CẢNH BÁO: Index signature phá hỏng TypeScript inference**
>
> Cách tiếp cận ban đầu dùng `[group: string]: Record<string, string>` sẽ **phá hỏng toàn bộ type inference** của lib. Khi thêm index signature, TypeScript widen `keyof TTheme["colors"]` thành `string` thay vì literal union `"base" | "text" | "surface"`. Hệ quả:
>
> - `InferColorKeys<TTheme>` trả về `string` thay vì `"primary" | "main"`
> - `InferColorGroupKeys<TTheme, "surface">` không hoạt động
> - Toàn bộ TypeScript_Inference_Plan bị phá hỏng
>
> **Phải chọn phương án thay thế.**

#### Phương án A: Index signature (ĐÃ LOẠI BỎ)

```typescript
// ❌ KHÔNG DÙNG — phá TypeScript inference
colors: {
  base: Record<string, string>;
  text: Record<string, string>;
  [group: string]: Record<string, string>;
};
```

#### Phương án B: Generic constraint trên factory functions (KHUYẾN NGHỊ)

Giữ `ThemeConfig` interface đơn giản cho documentation/validation, nhưng factory functions dùng generic constraint lỏng hơn:

```typescript
// ThemeConfig.ts — giữ interface cho documentation
export interface ThemeConfig {
  colors: {
    base: Record<string, string>;
    text: Record<string, string>;
  } & Record<string, Record<string, string>>; // intersect thay vì index signature
  typography: Record<string, TypographyConfig>;
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
  border?: Record<string, string>;
  themes?: Record<string, ThemeOverride>;
}
```

**Nhưng**: `& Record<string, ...>` vẫn có vấn đề tương tự với inference.

**Phương án tốt hơn — generic colors type:**

```typescript
// ThemeConfig.ts
export interface ThemeConfig<
  TColors extends Record<string, Record<string, string>> = Record<
    string,
    Record<string, string>
  >,
> {
  colors: TColors & {
    base: Record<string, string>;
    text: Record<string, string>;
  };
  typography: Record<string, TypographyConfig>;
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
  border?: Record<string, string>;
  themes?: Record<string, ThemeOverride>;
}
```

Khi user truyền `as const`, TypeScript sẽ infer `TColors` chính xác:

```typescript
const theme = {
  colors: {
    base: { primary: "#007AFF" },
    text: { main: "#1C1C20" },
    surface: { default: "#FFF", elevated: "#F2F2F7" },
  },
  // ...
} as const;

// TColors inferred = { base: {...}, text: {...}, surface: {...} }
// keyof TColors = "base" | "text" | "surface" (literal, không phải string)
```

#### Phương án C: Tách `customColors` thành field riêng (đơn giản nhất)

```typescript
export interface ThemeConfig {
  colors: {
    base: Record<string, string>;
    text: Record<string, string>;
  };
  customColors?: Record<string, Record<string, string>>; // Field riêng
  typography: Record<string, TypographyConfig>;
  // ...
}
```

Ưu điểm: Không ảnh hưởng inference cho `colors.base`/`colors.text` hiện tại.
Nhược điểm: API kém elegant — user phải nhớ `colors` vs `customColors`.

#### Quyết định: **Phương án B** (generic colors type)

Lý do:

1. Giữ API tự nhiên (`colors.surface.default` thay vì `customColors.surface.default`)
2. TypeScript inference vẫn hoạt động nhờ generic `TColors`
3. Backward compatible — theme cũ chỉ có `base` + `text` vẫn pass
4. Consumer dùng `as const` sẽ có literal types đầy đủ

**Tác động đến TypeScript_Inference_Plan**: Cần update `LooseThemeConfig` constraint để support generic `TColors`. Xem section "inference.ts" bên dưới.

### ThemeOverride mới

```typescript
export interface ThemeOverride {
  colors?: Partial<Record<string, Record<string, string>>>;
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}
```

Dùng `Partial<Record<string, ...>>` — cho phép override bất kỳ color group nào mà không cần khai báo trước. ThemeOverride không cần generic vì chỉ chứa partial values.

---

## Tác động đến từng module

### 1. `createStylePlugin.ts` — CSS Variables

**Hiện tại**: Hardcode 2 nhóm

```typescript
const colorConfig = enableCssVariables
  ? {
      ...mapToVarRefs("color-base", colors.base),
      ...mapToVarRefs("color-text", colors.text),
    }
  : {
      ...extractData(colors.base),
      ...extractData(colors.text),
    };
```

**Sau**: Iterate tất cả color groups, áp dụng SHORTHAND_GROUPS prefix logic

```typescript
const SHORTHAND_GROUPS = ["base", "text"];

const colorConfig: Record<string, string> = {};
for (const [group, values] of Object.entries(colors)) {
  if (SHORTHAND_GROUPS.includes(group)) {
    // Shorthand groups: register trực tiếp (backward compat)
    // → key "primary" → class "bg-primary"
    if (enableCssVariables) {
      Object.assign(colorConfig, mapToVarRefs(`color-${group}`, values));
    } else {
      Object.assign(colorConfig, extractData(values));
    }
  } else {
    // Custom groups: register với prefix
    // → key "surface-default" → class "bg-surface-default"
    for (const [key, value] of Object.entries(values)) {
      const flatKey = `${group}-${toKebabCase(key)}`;
      colorConfig[flatKey] = enableCssVariables
        ? `var(--color-${group}-${toKebabCase(key)})`
        : value;
    }
  }
}
```

> **Lưu ý**: `SHORTHAND_GROUPS` constant được dùng ở cả `createStylePlugin`, `generateSafelist`, và `createDesignTokens`. Nên define 1 lần trong `src/constants/` và import.

**CSS Variables output**:

```css
/* Hiện tại */
:root {
  --color-base-primary: #007aff;
  --color-text-main: #1c1c20;
}

/* Sau (thêm surface group) */
:root {
  --color-base-primary: #007aff;
  --color-text-main: #1c1c20;
  --color-surface-default: #ffffff;
  --color-surface-elevated: #f2f2f7;
}
```

### 2. `buildCssVars` — CSS Variables cho themes

**Hiện tại**: Hardcode `colors?.base` và `colors?.text`

```typescript
const buildCssVars = (source: VarSource): Record<string, string> => ({
  ...(source.colors?.base
    ? flattenToVars("color-base", source.colors.base)
    : {}),
  ...(source.colors?.text
    ? flattenToVars("color-text", source.colors.text)
    : {}),
  // ...
});
```

**Sau**: Iterate dynamic groups

```typescript
const buildCssVars = (source: VarSource): Record<string, string> => {
  const vars: Record<string, string> = {};

  if (source.colors) {
    for (const [group, values] of Object.entries(source.colors)) {
      if (values) {
        Object.assign(vars, flattenToVars(`color-${group}`, values));
      }
    }
  }

  if (source.shadows)
    Object.assign(vars, flattenToVars("shadow", source.shadows));
  if (source.backDropBlurs)
    Object.assign(vars, flattenToVars("backdrop-blur", source.backDropBlurs));
  if (source.borderRadius)
    Object.assign(vars, flattenToVars("radius", source.borderRadius));

  return vars;
};
```

**VarSource type update**:

```typescript
interface VarSource {
  colors?: Record<string, Record<string, string> | undefined>;
  shadows?: Record<string, string>;
  backDropBlurs?: Record<string, string>;
  borderRadius?: Record<string, string>;
}
```

### 3. `generateSafelist.ts` — Color classes

**Hiện tại**: Hardcode `colors.text` + `colors.base`

```typescript
const colorKeys = [
  ...Object.keys(colors.text),
  ...Object.keys(colors.base),
].map((k) => toKebabCase(k));
```

**Sau**: Iterate tất cả groups, **áp dụng SHORTHAND_GROUPS logic** (phải khớp với cách register vào Tailwind ở `createStylePlugin`)

> **QUAN TRỌNG**: Safelist color keys **phải khớp** với keys được register vào `extend.colors` trong `createStylePlugin`. Nếu plugin register color key là `surface-default` thì safelist phải sinh `bg-surface-default`, không phải `bg-default`.

```typescript
const SHORTHAND_GROUPS = ["base", "text"];

const colorKeys: string[] = [];
for (const [group, values] of Object.entries(colors)) {
  for (const key of Object.keys(values)) {
    const flatKey = SHORTHAND_GROUPS.includes(group)
      ? toKebabCase(key) // "primary", "main" (backward compat)
      : `${group}-${toKebabCase(key)}`; // "surface-default", "status-error"
    colorKeys.push(flatKey);
  }
}

const uniqueColorKeys = [...new Set(colorKeys)];

pushClasses("colors", ["text"], uniqueColorKeys);
pushClasses("colors", ["bg"], uniqueColorKeys);
pushClasses("colors", ["border"], uniqueColorKeys);
```

**Output ví dụ** (theme có `base`, `text`, `surface`, `status`):

```
text-primary, bg-primary, border-primary          ← base group (shorthand)
text-main, bg-main, border-main                   ← text group (shorthand)
text-surface-default, bg-surface-default, ...     ← surface group (prefixed)
text-status-error, bg-status-error, ...           ← status group (prefixed)
```

### 4. `createDesignTokens.ts` — DesignTokens

**Hiện tại**: Chỉ có `variantColor` (merged) và `variantTextColor`

```typescript
const variantTextColor = Object.keys(colors.text);
const variantBaseColor = Object.keys(colors.base);
const variantColors = [...variantBaseColor, ...variantTextColor].map(
  toKebabCase,
);
```

**Sau**: Thêm dynamic group tokens

```typescript
// Giữ variantColor như cũ (all colors merged)
const allColorKeys: string[] = [];
const colorGroups: Record<string, string[]> = {};

for (const [group, values] of Object.entries(colors)) {
  const keys = Object.keys(values).map(toKebabCase);
  colorGroups[group] = keys;
  allColorKeys.push(...keys);
}

// Return mới
return {
  DesignTokens: {
    Web: {
      variantColor: [...new Set(allColorKeys)], // Tất cả colors (backward compat)
      variantTextColor: colorGroups["text"] ?? [], // Backward compat
      variantColorGroups: colorGroups, // MỚI: { base: [...], text: [...], surface: [...] }
      // ... rest giữ nguyên
    },
  },
};
```

**Consumer usage**:

```typescript
const { DesignTokens } = createDesignTokens(theme);

// Backward compatible — vẫn dùng được
DesignTokens.Web.variantColor; // ["primary", "secondary", "main", "muted", "default", "elevated"]
DesignTokens.Web.variantTextColor; // ["main", "muted"]

// Mới — lấy riêng từng nhóm
DesignTokens.Web.variantColorGroups.surface; // ["default", "elevated"]
DesignTokens.Web.variantColorGroups.status; // ["success", "error", "warning"]
```

### 5. `inference.ts` — Type inference

**Hiện tại**: Hardcode `colors.base` + `colors.text`

```typescript
export type InferColorKeys<TTheme extends ThemeConfig> = KebabCase<
  Extract<
    keyof TTheme["colors"]["base"] | keyof TTheme["colors"]["text"],
    string
  >
>;
```

**Sau**: Infer từ tất cả color groups (dùng generic `TColors` từ phương án B)

> **QUAN TRỌNG**: `AllColorValues` type utility **chỉ hoạt động đúng** nếu `TTheme["colors"]` giữ literal keys. Điều này chỉ đạt được khi dùng **generic `TColors`** (phương án B) hoặc `as const`. Nếu dùng **index signature** (phương án A, đã loại bỏ), `AllColorValues` sẽ trả về `string` vì `keyof Record<string, ...>` = `string`.

```typescript
// Helper: Extract tất cả value keys từ mọi group trong colors
// Hoạt động vì TColors giữ literal type nhờ generic (phương án B)
type AllColorValues<TColors> = {
  [K in keyof TColors]: TColors[K] extends Record<string, string>
    ? keyof TColors[K]
    : never;
}[keyof TColors];

export type InferColorKeys<TTheme extends ThemeConfig> = KebabCase<
  Extract<AllColorValues<TTheme["colors"]>, string>
>;

// Infer keys theo từng group — dùng cho consumer lấy riêng nhóm
export type InferColorGroupKeys<
  TTheme extends ThemeConfig,
  TGroup extends keyof TTheme["colors"],
> =
  TTheme["colors"][TGroup] extends Record<string, string>
    ? KebabCase<Extract<keyof TTheme["colors"][TGroup], string>>
    : never;
```

**Tương thích với SHORTHAND_GROUPS ở type level:**

```typescript
// Infer flat color keys (đúng như register vào Tailwind)
// base + text → flatten keys trực tiếp
// custom groups → prefix-key
type InferFlatColorKey<TTheme extends ThemeConfig> =
  | KebabCase<Extract<keyof TTheme["colors"]["base"], string>>
  | KebabCase<Extract<keyof TTheme["colors"]["text"], string>>
  | {
      [G in Exclude<
        keyof TTheme["colors"],
        "base" | "text"
      >]: TTheme["colors"][G] extends Record<string, string>
        ? `${G & string}-${KebabCase<Extract<keyof TTheme["colors"][G], string>>}`
        : never;
    }[Exclude<keyof TTheme["colors"], "base" | "text">];
```

**Consumer type usage**:

```typescript
import type { InferColorGroupKeys } from "@duydpdev/style-generator";

type SurfaceColor = InferColorGroupKeys<typeof theme, "surface">;
// → "default" | "elevated"

type StatusColor = InferColorGroupKeys<typeof theme, "status">;
// → "success" | "error" | "warning"

// Hoặc dùng flat keys (đúng như Tailwind class names)
type AllFlatColorKey = InferFlatColorKey<typeof theme>;
// → "primary" | "main" | "surface-default" | "surface-elevated" | "status-success" | ...
```

---

## Backward Compatibility

### Theme config cũ vẫn hoạt động

```json
{
  "colors": {
    "base": { "primary": "#007AFF" },
    "text": { "main": "#1C1C20" }
  }
}
```

Không cần thay đổi gì. `colors` chỉ có `base` + `text` → output y hệt hiện tại.

### API không thay đổi signature

| Function                             | Thay đổi                                    |
| ------------------------------------ | ------------------------------------------- |
| `createStyleSystem(theme, options)`  | Không đổi signature                         |
| `createStylePlugin(theme, options)`  | Không đổi signature                         |
| `generateSafelist(theme, options)`   | Không đổi signature                         |
| `createDesignTokens(theme, options)` | Return thêm `variantColorGroups` (additive) |

### DesignTokens backward compat

| Field                | Trạng thái                        |
| -------------------- | --------------------------------- |
| `variantColor`       | Giữ nguyên — merged tất cả colors |
| `variantTextColor`   | Giữ nguyên — chỉ text group       |
| `variantColorGroups` | **Mới** — object theo group       |

---

## Edge cases cần xử lý

| Case                                                               | Xử lý                                                                                                                                                                                             |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hai nhóm có key trùng nhau (vd: `base.primary` + `status.primary`) | CSS variable khác prefix (`--color-base-primary` vs `--color-status-primary`), nhưng Tailwind class `bg-primary` chỉ ref 1. Ưu tiên group đầu tiên (theo Object.entries order), hoặc báo warning. |
| Group rỗng: `"surface": {}`                                        | Bỏ qua, không sinh CSS vars hay safelist cho group rỗng                                                                                                                                           |
| Tên group chứa ký tự đặc biệt                                      | Dùng `toKebabCase` cho prefix: `"statusColors"` → `--color-status-colors-*`                                                                                                                       |
| ThemeOverride cho custom group                                     | Iterate `Object.entries(override.colors)` giống base theme                                                                                                                                        |

### Giải quyết trùng key giữa nhóm (chi tiết)

**Vấn đề**: Khi `base.primary` và `accent.primary` cùng tồn tại:

- CSS vars không xung đột: `--color-base-primary` vs `--color-accent-primary`
- Tailwind color class `bg-primary` chỉ map tới 1 giá trị → **xung đột**

**Giải pháp**: Tailwind color registration dùng flat namespace (group prefix):

```typescript
// Thay vì flatten key "primary" trực tiếp, prefix bằng group name
const colorConfig: Record<string, string> = {};
for (const [group, values] of Object.entries(colors)) {
  for (const [key, value] of Object.entries(values)) {
    const flatKey = `${group}-${toKebabCase(key)}`;
    // → "base-primary", "accent-primary" — không xung đột
    colorConfig[flatKey] = enableCssVariables
      ? `var(--color-${group}-${toKebabCase(key)})`
      : value;
  }
}
```

**Nhưng**: Điều này thay đổi class names từ `bg-primary` → `bg-base-primary`. Đây là **breaking change**.

**Phương án thay thế (không breaking)**:

- Giữ group `base` và `text` flatten trực tiếp (backward compat): `bg-primary`, `text-main`
- Nhóm custom mới dùng prefix: `bg-surface-default`, `bg-status-error`
- Ghi rõ trong docs: `base` và `text` là "shorthand groups", các nhóm khác dùng full prefix

```typescript
const SHORTHAND_GROUPS = ["base", "text"];

for (const [group, values] of Object.entries(colors)) {
  for (const [key, value] of Object.entries(values)) {
    const flatKey = SHORTHAND_GROUPS.includes(group)
      ? toKebabCase(key)                          // "primary", "main"
      : `${group}-${toKebabCase(key)}`;           // "surface-default", "status-error"
    colorConfig[flatKey] = /* ... */;
  }
}
```

**CSS classes output**:

```
bg-primary          ← từ colors.base.primary (shorthand)
text-main           ← từ colors.text.main (shorthand)
bg-surface-default  ← từ colors.surface.default (prefixed)
bg-status-error     ← từ colors.status.error (prefixed)
```

---

## Implementation Steps

### Step 0 (tiền điều kiện): Thêm `SHORTHAND_GROUPS` constant

- Tạo constant `SHORTHAND_GROUPS = ["base", "text"] as const` trong `src/constants/`
- Export để dùng ở `createStylePlugin`, `generateSafelist`, `createDesignTokens`
- Đây là single source of truth cho logic prefix/flatten

### Step 1: Update `ThemeConfig.ts`

- Thêm generic `TColors` cho `ThemeConfig` (phương án B — **KHÔNG dùng index signature**)
- Update `ThemeOverride` dùng `Partial<Record<string, ...>>`
- Verify: `yarn build` pass, existing theme.json vẫn assignable
- Verify: `npx tsc --noEmit` pass — TypeScript vẫn infer literal types cho `base` và `text`

### Step 2: Update `createStylePlugin.ts`

- Refactor `colorConfig` builder → iterate `Object.entries(colors)`
- Refactor `buildCssVars` → iterate dynamic color groups
- Verify: CSS output cho `examples/theme.json` không đổi

### Step 3: Update `generateSafelist.ts`

- Refactor color key extraction → iterate tất cả groups
- Apply shorthand/prefix logic
- Verify: safelist output cho `examples/theme.json` không đổi

### Step 4: Update `createDesignTokens.ts`

- Thêm `variantColorGroups` vào return
- Giữ `variantColor` và `variantTextColor` backward compat
- Verify: existing consumer code không bị break

### Step 5: Update `inference.ts`

- Thêm `AllColorValues` type helper
- Update `InferColorKeys`
- Thêm `InferColorGroupKeys`
- Verify: `npx tsc --noEmit` pass

### Step 6: Update docs + examples

- Thêm example theme.json với custom groups
- Update README section "Theme Config"
- Update `docs/guide.md`

---

## Verification

- [ ] `examples/theme.json` (chỉ có base + text) → output **không đổi** (CSS vars, safelist, tokens)
- [ ] Theme mới với `surface`, `status` groups → sinh đúng CSS vars, safelist classes, tokens
- [ ] `DesignTokens.Web.variantColor` vẫn chứa tất cả color keys (merged)
- [ ] `DesignTokens.Web.variantTextColor` vẫn chỉ chứa text group keys
- [ ] `DesignTokens.Web.variantColorGroups` chứa đúng từng group
- [ ] TypeScript infer đúng literal types cho custom groups
- [ ] Theme override cho custom groups sinh đúng `html[data-theme]` CSS vars
- [ ] `yarn lint` + `yarn build` pass

---

## Timeline ước tính

| Step                            | Effort    |
| ------------------------------- | --------- |
| Step 1-2 (ThemeConfig + Plugin) | ~3h       |
| Step 3 (Safelist)               | ~1.5h     |
| Step 4-5 (Tokens + Types)       | ~2h       |
| Step 6 (Docs)                   | ~1h       |
| **Tổng**                        | **~7.5h** |
