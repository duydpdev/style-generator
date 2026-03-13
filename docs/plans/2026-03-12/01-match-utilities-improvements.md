# Kế hoạch dự án: matchUtilities & Cải thiện Plugin

## Tổng quan

Dựa trên phân tích codebase thực tế và Context7 docs (Catppuccin, Fluid TailwindCSS), kế hoạch này đề xuất 7 cải tiến cho Tailwind plugin — tất cả đều opt-in, zero breaking change:

1. `matchUtilities` cho **Spacing** — JIT thực sự, loại bỏ safelist
2. **Typography via CSS Custom Properties** — refactor sang CSS var-driven (giữ `addUtilities`)
3. **Tailwind v4 `@plugin`** CSS-first support — subpath export riêng biệt
4. **Đặt tên CSS variable** theo chuẩn Tailwind v4 — `colorNamingMode` thay thế `disableColorPrefix`
5. **Subpath Exports** — tree-shaking (`/plugin`, `/tokens`, `/cva`, `/spacing`)
6. **`defineTheme()` helper** — type safety tại config site với zero runtime cost
7. **Test coverage** — unit tests cho `spacing.ts` và `createStylePlugin.ts`

---

## Loại dự án

LIBRARY

---

## Tiêu chí hoàn thành

1. Consumer có thể dùng `sp-p-4`, `sp-p-[24px]` với arbitrary value — song song với `.sp-p` hiện tại
2. Typography static classes vẫn hoạt động; khi `cssVarDriven: true`, CSS vars inject vào `:root` và utilities tham chiếu vars
3. `@plugin "./my-style-plugin.ts"` hoạt động trong Tailwind v4 (consumer tạo wrapper file)
4. `colorNamingMode: "v4"` tạo `--color-*` vars; backward-compat với `disableColorPrefix` cũ
5. Subpath exports hoạt động sau khi refactor internal imports
6. `defineTheme(config)` trả về typed config, TS báo lỗi khi thiếu required fields
7. Tất cả tests pass, coverage cho `spacing.ts` và `createStylePlugin.ts` > 80%

---

## Bối cảnh & Phân tích

### Hiện trạng

| Tính năng       | API hiện tại                               | Hạn chế                                                    |
| --------------- | ------------------------------------------ | ---------------------------------------------------------- |
| Spacing         | `addUtilities` -> static `.sp-p`, `.sp-mx` | Phải khai báo trong safelist; không hỗ trợ arbitrary value |
| Typography      | `addUtilities` -> static classes           | Tất cả pre-registered, không CSS var-driven                |
| Tailwind v4     | `plugin(creator, config)` dạng v3          | `@plugin` directive chưa hoạt động                         |
| CSS var naming  | `--color-base-*`, `--color-text-*`         | v4 chỉ auto-detect namespace `--color-*` không có sub-ns   |
| Package exports | Single entry `.` -> toàn bộ bundle         | Không tree-shaking, import thừa cả CVA/CLI code            |
| Type safety     | Config object tự do, không `satisfies`     | Typo config chỉ phát hiện lúc runtime                      |
| Tests           | `cssVariables.test.ts` chỉ cover utils     | `spacing.ts`, `createStylePlugin.ts` chưa có unit test     |

### Hai mode Spacing song song (QUAN TRONG)

Sau khi implement Task 01, library hỗ trợ **2 cách dùng spacing ĐỘC LẬP**:

| Mode                  | API                                                                    | Use case            | Responsive                          | Cần safelist? |
| --------------------- | ---------------------------------------------------------------------- | ------------------- | ----------------------------------- | ------------- |
| **Static (hiện tại)** | `resolveSpacingProps()` -> `className="sp-p" style={{--sp-p: "1rem"}}` | React inline styles | Qua CSS var chain `--tw-sp-p`       | Có            |
| **JIT (mới)**         | Viết trực tiếp `sp-p-4` hoặc `sp-p-[24px]` trong template              | HTML/JSX template   | Qua Tailwind responsive `md:sp-p-8` | Không         |

> `resolveSpacingProps()` KHÔNG thay đổi khi thêm `matchUtilities`. Hai mode hoạt động song song, KHÔNG conflict.

### Tại sao KHÔNG dùng `matchUtilities` cho Typography?

`matchUtilities` thiết kế cho **single CSS property mapping**: `sp-p-4` -> `padding: 1rem`.

Typography là **multi-property**: `font-size + line-height + font-weight + letter-spacing`. Dùng `matchUtilities` buộc phải tạo API lạ như `{ DEFAULT: name }` — không có ý nghĩa semantic. Hướng đúng: **CSS custom properties** cho phép override từng property riêng lẻ mà không phá vỡ API hiện tại.

---

## Chi tiết các Task

### [x] Task 01: `matchUtilities` cho Spacing

- **Agent**: frontend-specialist (plugin/spacing domain)
- **Input**: `src/features/spacing/spacing.ts`, `src/core/Options.ts`
- **Output**:
  - Thêm `api.matchUtilities()` trong `generateSpacingRules` khi `spacing.useMatchUtilities === true`
  - Giữ nguyên `api.addUtilities()` static classes — backward-compatible, responsive chain vẫn hoạt động
  - `resolveSpacingProps()` KHÔNG thay đổi — hai mode hoạt động độc lập
  - Spacing entries trong safelist được tự động skip khi `useMatchUtilities: true`
- **Verify**: Test case `sp-p-4`, `sp-p-[20px]` generate đúng CSS; `.sp-p` static + responsive vẫn hoạt động

**Thay đổi trong Options.ts:**

```typescript
// src/core/Options.ts — thêm vào spacing config
spacing?: {
  enabled?: boolean;
  properties?: SpacingPropertyMap;
  /** Enable matchUtilities for JIT arbitrary value support (sp-p-4, sp-p-[24px]).
   *  Static .sp-p classes vẫn tồn tại song song. @default false */
  useMatchUtilities?: boolean;
};
```

**Implementation trong spacing.ts:**

```typescript
// src/features/spacing/spacing.ts — thêm vào cuối generateSpacingRules()
// SAU api.addUtilities(utilities), thêm:
if (options.spacing?.useMatchUtilities) {
  for (const [key, cssProps] of Object.entries(spacingProps)) {
    api.matchUtilities(
      {
        [`sp-${key}`]: (value: string) => {
          const result: Record<string, string> = {};
          for (const cssProp of Object.keys(cssProps)) {
            result[cssProp] = value;
          }
          return result;
        },
      },
      {
        values: api.theme("spacing"),
        supportsNegativeValues: false,
      },
    );
  }
}
```

**Interaction giữa static và JIT:**

- `.sp-p` (static) dùng `padding: var(--tw-sp-p)` — responsive qua CSS var chain
- `.sp-p-4` (JIT) dùng `padding: 1rem` — responsive qua Tailwind `md:sp-p-4`
- Hai class KHÔNG conflict vì dùng cơ chế khác nhau
- Consumer chọn mode phù hợp: React inline style dùng static, template HTML dùng JIT

---

### [x] Task 02: Typography via CSS Custom Properties

- **Agent**: frontend-specialist
- **Input**: `src/features/plugin/createStylePlugin.ts`, `src/core/ThemeConfig.ts`
- **Output**:
  - Giữ `addUtilities()` cho typography static classes (không breaking)
  - Khi `typography.cssVarDriven: true`:
    1. Inject CSS vars vào `:root` (e.g., `--typography-heading-font-size: 2rem`)
    2. Static utilities tham chiếu CSS vars thay vì hard-coded values
  - Consumer có thể override typography token bằng CSS var
- **Verify**: Typography classes vẫn generate đúng CSS; CSS vars inject vào `:root`; override bằng CSS var hoạt động

**Implementation chi tiết (2 phần):**

```typescript
// PHẦN 1: Inject CSS vars vào :root
const typographyVars: Record<string, string> = {};
for (const [name, styles] of Object.entries(typography)) {
  for (const [prop, value] of Object.entries(styles)) {
    // toKebabCase("fontSize") -> "font-size"
    typographyVars[`--typography-${toKebabCase(name)}-${toKebabCase(prop)}`] =
      String(value);
  }
}
api.addBase({ ":root": typographyVars });

// PHẦN 2: Static utilities tham chiếu CSS vars
const varDrivenTypography: Record<string, Record<string, string>> = {};
for (const [name, styles] of Object.entries(typography)) {
  const varStyles: Record<string, string> = {};
  for (const prop of Object.keys(styles)) {
    const cssProp = toKebabCase(prop); // "fontSize" -> "font-size"
    varStyles[cssProp] = `var(--typography-${toKebabCase(name)}-${cssProp})`;
  }
  varDrivenTypography[`.${toKebabCase(name)}`] = varStyles;
}
api.addUtilities(varDrivenTypography);
```

**Output CSS khi `cssVarDriven: true`:**

```css
:root {
  --typography-heading-font-size: 2rem;
  --typography-heading-line-height: 1.2;
  --typography-heading-font-weight: 700;
  --typography-heading-letter-spacing: -0.02em;
}
.heading {
  font-size: var(--typography-heading-font-size);
  line-height: var(--typography-heading-line-height);
  font-weight: var(--typography-heading-font-weight);
  letter-spacing: var(--typography-heading-letter-spacing);
}
/* Consumer override: */
.custom {
  --typography-heading-font-size: 3rem;
}
```

**Thay đổi trong Options.ts:**

```typescript
// Thêm typography config (tương tự spacing pattern)
typography?: {
  /** When true, inject CSS vars and reference them in utilities.
   *  When false (default), utilities use hard-coded values. */
  cssVarDriven?: boolean;
};
```

---

### [ ] Task 03: Tailwind v4 `@plugin` CSS-first Support *(deferred — high effort, v4 API còn thay đổi)*

- **Agent**: frontend-specialist
- **Input**: `src/v4/index.ts` (mới), `src/features/plugin/createStylePlugin.ts`, `package.json`, `vite.config.ts`
- **Output**:
  - File entry riêng: `src/v4/index.ts` — export default bare function (v4 format)
  - Subpath export `"./v4"` trong `package.json` exports field
  - Consumer phải tạo **wrapper file** vì `@plugin` không thể truyền TypeScript config object qua CSS
- **Verify**: Wrapper file + `@plugin` directive hoạt động; v3 format không bị ảnh hưởng

**QUAN TRONG - Consumer DX trong v4:**

v4 `@plugin` import module -> gọi default export. KHÔNG thể truyền `themeConfig` object qua CSS syntax. Consumer cần tạo wrapper file:

```typescript
// consumer: style-plugin.ts (wrapper file)
import { createStylePluginV4 } from "@duydpdev/style-generator/v4";
import themeConfig from "./theme.json";

export default createStylePluginV4(themeConfig, {
  colorNamingMode: "v4",
});
```

```css
/* consumer: tailwind.css */
@import "tailwindcss";
@plugin "./style-plugin.ts";
```

> Ghi chú: Một số v4 plugins hỗ trợ truyền options đơn giản qua CSS (`@plugin "lib" { key: "value" }`), nhưng chỉ giới hạn string values. Với ThemeConfig phức tạp, wrapper file là approach duy nhất khả thi.

**Điểm khác biệt v3 vs v4:**

| Aspect          | v3 (`plugin(creator, config)`) | v4 (`@plugin` format)                 |
| --------------- | ------------------------------ | ------------------------------------- |
| Wrapper         | `plugin.withOptions()`         | Default export bare function          |
| Colors          | `theme.extend.colors`          | CSS vars `--color-*` (v4 auto-detect) |
| Screens         | `theme.screens`                | `@theme { --breakpoint-*: ... }`      |
| Config delivery | JS object argument             | Wrapper file import                   |

**Implementation:**

```typescript
// src/v4/index.ts
import type { PluginAPI } from "tailwindcss/types/config";
import type { ThemeConfig } from "../core/ThemeConfig";
import type { StyleGeneratorOptions } from "../core/Options";
import { flattenToVars } from "../features/plugin/cssVariables";
import { generateSpacingRules } from "../features/spacing/spacing";
import { toKebabCase, addDot } from "../shared/helpers";

/**
 * Create a Tailwind v4-compatible plugin.
 * Usage: consumer creates a wrapper file that calls this function,
 * then references the wrapper via @plugin directive in CSS.
 */
export const createStylePluginV4 = (
  config: ThemeConfig,
  options: StyleGeneratorOptions = {},
) => {
  return (api: PluginAPI) => {
    const { colors, typography, shadows, backDropBlurs, borderRadius } = config;
    const colorNamingMode = options.colorNamingMode ?? "v4"; // default v4 for v4 plugin

    // Colors: inject as --color-* CSS vars (v4 auto-detects this namespace)
    const colorVars: Record<string, string> = {};
    if (colors.base) {
      Object.assign(
        colorVars,
        flattenToColorVars(colors.base, "base", colorNamingMode),
      );
    }
    if (colors.text) {
      Object.assign(
        colorVars,
        flattenToColorVars(colors.text, "text", colorNamingMode),
      );
    }
    if (colors.common) {
      Object.assign(
        colorVars,
        flattenToColorVars(colors.common, "common", colorNamingMode),
      );
    }

    // Inject all CSS vars at :root
    api.addBase({ ":root": colorVars });

    // Typography + spacing: reuse existing logic
    api.addUtilities(
      addDot(typography) as Record<string, Record<string, string | string[]>>,
    );

    if (options.spacing?.enabled !== false) {
      generateSpacingRules(api, options, {});
    }
  };
};
```

---

### [x] Task 04: Chuẩn hóa tên CSS Variable — `colorNamingMode`

- **Agent**: frontend-specialist
- **Input**: `src/features/plugin/cssVariables.ts`, `src/features/plugin/createStylePlugin.ts`, `src/core/Options.ts`
- **Output**:
  - Thêm `colorNamingMode?: "v3" | "v4" | "flat"` vào `StyleGeneratorOptions`
  - `disableColorPrefix` deprecated: vẫn hoạt động (map sang `colorNamingMode: "flat"` nội bộ)
  - `flattenToVars()` và `mapToVarRefs()` backward-compat: param thứ 3 accept cả `boolean` và `options object`
  - Theme overrides (`html[data-theme]`) cập nhật theo naming mode
- **Verify**: Ba mode generate đúng CSS var names; `disableColorPrefix: true` vẫn hoạt động không break

**QUAN TRONG - Backward-compat cho public API:**

`flattenToVars` và `mapToVarRefs` là public exports. Param thứ 3 hiện tại là `boolean`. Dùng union type:

```typescript
// Backward-compat: accept boolean (legacy) hoặc options object (mới)
export interface FlattenVarsOptions {
  disablePrefix?: boolean;
  colorNamingMode?: "v3" | "v4" | "flat";
}

export const flattenToVars = (
  prefix: string,
  data: Record<string, string | Record<string, string>>,
  disablePrefixOrOptions: boolean | FlattenVarsOptions = false,
): Record<string, string> => {
  // Normalize legacy boolean to options
  const options: FlattenVarsOptions =
    typeof disablePrefixOrOptions === "boolean"
      ? { disablePrefix: disablePrefixOrOptions }
      : disablePrefixOrOptions;

  // ... logic dựa trên options.colorNamingMode
};
```

**Bảng mapping theo mode:**

| Namespace       | `v3` (default)          | `v4`                 | `flat`            |
| --------------- | ----------------------- | -------------------- | ----------------- |
| `base.primary`  | `--color-base-primary`  | `--color-primary`    | `--color-primary` |
| `text.muted`    | `--color-text-muted`    | `--color-text-muted` | `--color-muted`   |
| `common.accent` | `--color-common-accent` | `--color-accent`     | `--color-accent`  |

> `v4` mode: flatten `base` va `common`, giữ `text` (hợp lệ trong v4 auto-detect).
> `flat` mode: flatten tất cả namespace. Tương đương `disableColorPrefix: true` cũ.

**Logic trong `buildCssVars` khi dùng `colorNamingMode`:**

```typescript
// createStylePlugin.ts
const buildCssVars = (
  source: VarSource,
  options: {
    disableColorPrefix?: boolean;
    colorNamingMode?: "v3" | "v4" | "flat";
  },
): Record<string, string> => {
  // Resolve legacy flag
  const mode =
    options.colorNamingMode ?? (options.disableColorPrefix ? "flat" : "v3");

  const namespacesToFlatten =
    mode === "v4"
      ? ["base", "common"]
      : mode === "flat"
        ? ["base", "text", "common"]
        : []; // v3: keep all namespaces

  return {
    ...(source.colors?.base
      ? flattenToVars(
          namespacesToFlatten.includes("base") ? "color" : "color-base",
          source.colors.base,
        )
      : {}),
    // ... tương tự cho text, common
  };
};
```

---

### [ ] Task 05: Subpath Exports cho Tree-shaking *(deferred — high effort, cần refactor import graph)*

- **Agent**: frontend-specialist
- **Input**: `package.json`, `vite.config.ts`, `src/index.ts`, internal import graph
- **Output**:
  - Subpath exports: `./plugin`, `./tokens`, `./cva`, `./spacing`, `./v4`
  - Refactor internal imports để tách dependency graph
  - Build config multi-entry trong `vite.config.ts`
- **Verify**: `import { createStylePlugin } from "@duydpdev/style-generator/plugin"` không kéo CVA code

**QUAN TRONG - Refactor internal imports trước khi thêm subpath exports:**

Import graph hiện tại:

```
createStylePlugin.ts
  -> cssVariables.ts (OK, nhỏ)
  -> spacing.ts (OK)
  -> safelist/generateSafelist.ts (kéo safelist domain)
  -> shared/helpers.ts (OK, nhỏ)
```

Vấn đề: `createStylePlugin` import `generateSafelist` -> subpath `./plugin` sẽ kéo toàn bộ safelist code. Cần refactor:

1. Tách safelist generation ra khỏi `createStylePlugin` — truyền safelist từ bên ngoài (đã có param `safelist?`)
2. Trong subpath `./plugin`, consumer tự gọi `generateSafelist` nếu cần

**Package exports structure:**

```json
"exports": {
  ".": {
    "import": "./dist/index.js",
    "require": "./dist/index.cjs",
    "types": "./dist/index.d.ts"
  },
  "./plugin": {
    "import": "./dist/plugin/index.js",
    "types": "./dist/plugin/index.d.ts"
  },
  "./tokens": {
    "import": "./dist/tokens/index.js",
    "types": "./dist/tokens/index.d.ts"
  },
  "./cva": {
    "import": "./dist/cva/index.js",
    "types": "./dist/cva/index.d.ts"
  },
  "./spacing": {
    "import": "./dist/spacing/index.js",
    "types": "./dist/spacing/index.d.ts"
  },
  "./v4": {
    "import": "./dist/v4/index.js",
    "types": "./dist/v4/index.d.ts"
  }
}
```

**Vite config change:**

```typescript
// vite.config.ts — multi-entry
build: {
  lib: {
    entry: {
      index: "src/index.ts",
      "plugin/index": "src/plugin/index.ts",
      "tokens/index": "src/tokens/index.ts",
      "cva/index": "src/cva/index.ts",
      "spacing/index": "src/spacing/index.ts",
      "v4/index": "src/v4/index.ts",
    },
  },
}
```

---

### [x] Task 06: `defineTheme()` Helper — Type Safety tại Config Site

- **Agent**: frontend-specialist
- **Input**: `src/core/ThemeConfig.ts`, `src/index.ts`
- **Output**:
  - `defineTheme<T extends ThemeConfig>(config: T): T` — identity function, zero runtime cost
  - `defineOptions<T extends StyleGeneratorOptions>(options: T): T` — tương tự
  - Export từ `src/index.ts`
- **Verify**: `defineTheme({ colors: {} })` -> TS error vì thiếu `typography` (required field); bundle không tăng size

**Implementation:**

```typescript
// src/core/defineTheme.ts
import type { ThemeConfig } from "./ThemeConfig";
import type { StyleGeneratorOptions } from "./Options";

/** Type-safe theme config helper. Zero runtime cost.
 *  @example
 *  const theme = defineTheme({
 *    colors: { base: { primary: "#007AFF" } },
 *    typography: { heading: { fontSize: "2rem", lineHeight: "1.2", fontWeight: 700, letterSpacing: "-0.02em" } },
 *  });
 */
export function defineTheme<T extends ThemeConfig>(config: T): T {
  return config;
}

/** Type-safe options helper. Zero runtime cost. */
export function defineOptions<T extends StyleGeneratorOptions>(options: T): T {
  return options;
}
```

**Verify cases:**

```typescript
// OK - full config
const theme = defineTheme({
  colors: { base: { primary: "#007AFF" } },
  typography: {
    h1: {
      fontSize: "2rem",
      lineHeight: "1.2",
      fontWeight: 700,
      letterSpacing: "0",
    },
  },
});

// TS Error: Property 'typography' is missing
defineTheme({ colors: {} });

// TS Error: Property 'fontSize' is missing in TypographyConfig
defineTheme({
  colors: {},
  typography: { h1: { lineHeight: "1.2" } }, // thiếu fontSize, fontWeight, letterSpacing
});
```

---

### [x] Task 07: Test Coverage cho `spacing.ts` và `createStylePlugin.ts`

- **Agent**: test-engineer
- **Input**: `src/features/spacing/spacing.ts`, `src/features/plugin/createStylePlugin.ts`
- **Output**:
  - `src/features/spacing/spacing.test.ts` — unit tests cho `generateSpacingRules`, `buildResponsiveStyles`, `buildFlatStyles`
  - `src/features/plugin/createStylePlugin.test.ts` — unit tests cho `createStylePlugin`
  - Mock Tailwind `PluginAPI` (addBase, addUtilities, matchUtilities, theme)
  - Coverage target: > 80% cho cả hai file
- **Verify**: `yarn test:coverage` report bao gồm hai file mới

**Mock PluginAPI factory:**

```typescript
// test-utils/mockPluginApi.ts
export const createMockPluginAPI = () => {
  const bases: Record<string, unknown>[] = [];
  const utilities: Record<string, unknown>[] = [];
  const matchedUtilities: Array<{ utils: unknown; options: unknown }> = [];

  return {
    api: {
      addBase: (base: Record<string, unknown>) => bases.push(base),
      addUtilities: (utils: Record<string, unknown>) => utilities.push(utils),
      matchUtilities: (utils: unknown, opts: unknown) =>
        matchedUtilities.push({ utils, options: opts }),
      theme: (key: string) => {
        if (key === "spacing")
          return { 0: "0px", 1: "0.25rem", 2: "0.5rem", 4: "1rem", 8: "2rem" };
        return {};
      },
    } as unknown as PluginAPI,
    bases,
    utilities,
    matchedUtilities,
  };
};
```

**Test cases:**

```typescript
// spacing.test.ts
describe("generateSpacingRules", () => {
  it("registers .sp-p utility with addUtilities");
  it(
    "builds responsive fallback chain var(--sp-p-md, var(--sp-p)) when enableResponsive=true",
  );
  it("uses direct var(--sp-p) when enableResponsive=false");
  it("registers matchUtilities when spacing.useMatchUtilities=true");
  it("static .sp-p and matchUtilities sp-p coexist when both enabled");
  it("uses custom spacing properties when spacing.properties provided");
});

// createStylePlugin.test.ts
describe("createStylePlugin", () => {
  it("returns a Tailwind plugin instance");
  it("injects :root CSS variables via addBase when enableCssVariables=true");
  it("injects html[data-theme] overrides for each theme");
  it("skips CSS variables when enableCssVariables=false");
  it("generates typography utilities via addUtilities");
  it("passes color var refs to theme.extend.colors");
  it("skips spacing rules when spacing.enabled=false");
  it("includes safelist in tailwind config");
});
```

---

## Thứ tự thực hiện & Rủi ro

| Task                            | Effort | Rủi ro     | Breaking?        | Ưu tiên    |
| ------------------------------- | ------ | ---------- | ---------------- | ---------- |
| 07 - Tests cho spacing & plugin | Low    | Không      | Không            | Cao nhất   |
| 06 - defineTheme() helper       | Low    | Không      | Không (additive) | Cao        |
| 01 - matchUtilities Spacing     | Medium | Thấp       | Không (opt-in)   | Cao        |
| 04 - colorNamingMode            | Medium | Thấp       | Không (opt-in)   | Cao        |
| 02 - Typography CSS Vars        | Low    | Thấp       | Không (opt-in)   | Trung bình |
| 05 - Subpath Exports            | High   | Trung bình | Không (additive) | Trung bình |
| 03 - v4 @plugin Support         | High   | Trung bình | Không (additive) | Thấp       |

**Thứ tự đề xuất**: 07 -> 06 -> 01 -> 04 -> 02 -> 05 -> 03

**Lý do thứ tự:**

- **07 trước** -> regression safety cho tất cả task sau
- **06 trước 01** -> effort thấp, impact cao, không dependency
- **05 lên High effort** vì cần refactor internal import graph (createStylePlugin -> safelist dependency)
- **03 cuối** vì v4 PluginAPI types còn thay đổi, cần pin version test

---

## Sửa lỗi trong các Draft Trước

| Vấn đề                                                               | Sửa                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Draft 1: Task 02 dùng `matchUtilities` cho multi-property typography | Thay bằng CSS custom property-driven approach                      |
| Draft 1: `v4ColorNaming: boolean` chồng chéo `disableColorPrefix`    | Thay bằng `colorNamingMode` enum + deprecate `disableColorPrefix`  |
| Draft 1: Task 03 thiếu details (default export, @theme, screens)     | Bổ sung đầy đủ                                                     |
| Draft 1: `mapToVarRefs()` bỏ sót khi đổi naming                      | Bổ sung vào Task 04                                                |
| Draft 2: `resolveSpacingProps()` update sai hướng                    | Giữ nguyên `resolveSpacingProps` — JIT và static là 2 mode độc lập |
| Draft 2: Task 02 thiếu phần utilities reference CSS vars             | Bổ sung PHẦN 2: addUtilities tham chiếu `var(--typography-*)`      |
| Draft 2: Task 03 consumer không thể truyền config qua CSS            | Bổ sung wrapper file pattern                                       |
| Draft 2: `flattenToVars` param 3 đổi type = breaking public API      | Dùng union type `boolean \| FlattenVarsOptions` backward-compat    |
| Draft 2: Task 05 tree-shaking ảo (import graph chưa tách)            | Nâng effort lên High, bổ sung refactor import graph step           |
| Draft 2: Task 06 verify example sai (TS không báo lỗi "not-a-color") | Sửa verify: thiếu `typography` required field                      |
| Draft 2: Thiếu `task.md`                                             | Tạo riêng                                                          |

---

## Ghi chú

- Tất cả cải tiến đều opt-in — zero breaking change với v3 consumers
- `flattenToVars` / `mapToVarRefs` public API giữ backward-compat qua union type param
- Task 05 effort High hơn draft trước vì cần refactor `createStylePlugin` -> tách safelist dependency
- Task 03 cần consumer tạo wrapper file — document rõ trong README/migration guide
- `disableColorPrefix` giữ backward-compat, log deprecation warning, remove ở next major
