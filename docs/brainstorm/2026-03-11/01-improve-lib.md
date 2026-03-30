# Brainstorm: Cải thiện `@duydpdev/style-generator`

## Context

Library hiện tại: 12 KB ESM, TypeScript inference tốt, 2 runtime deps, CLI hỗ trợ.
Mục tiêu: **type safe hơn**, **bundle nhỏ hơn**, **setup đơn giản hơn**.

---

## 🔐 GOAL 1: Type Safety

### Option A: Zod Schema Validation

Thêm Zod để validate `theme.json` tại runtime, tự động generate TypeScript types từ schema.

```typescript
const ThemeSchema = z.object({
  colors: z.object({ base: z.record(z.string()) }).optional(),
  // ...
});
type ThemeConfig = z.infer<typeof ThemeSchema>;
```

✅ **Pros:**

- Runtime + compile-time validation đồng bộ
- Error messages rõ ràng cho user
- Schema → TypeScript type tự động

❌ **Cons:**

- Zod thêm ~13 KB vào bundle
- Làm phức tạp code, conflict với current inference system
- User phải hiểu Zod errors

📊 **Effort:** High

---

### Option B: Branded Types + Validation Functions

Giữ current inference system, thêm helper để enforce branded types tại runtime.

```typescript
type ThemeKey = string & { readonly _brand: "ThemeKey" };
function assertThemeKey(s: string): ThemeKey {
  if (!s.match(/^[a-z][a-z0-9-]*$/)) throw new Error(`Invalid key: ${s}`);
  return s as ThemeKey;
}
```

✅ **Pros:**

- Zero dependency thêm
- Compatible với current codebase
- Granular control

❌ **Cons:**

- Phải manually maintain validation logic
- Không tự sync với TypeScript types

📊 **Effort:** Low

---

### Option C: Strict Mode Interface + `satisfies` operator ⭐ RECOMMENDED

Expose `defineTheme()` helper sử dụng TypeScript `satisfies` để enforce strict types ngay tại config level.

```typescript
// User code
const theme = defineTheme({
  colors: { base: { primary: "#3b82f6" } },
} satisfies ThemeConfig);
//           ↑ Catches errors at definition site, not call site
```

✅ **Pros:**

- Zero runtime cost (pure TypeScript)
- Best-in-class DX — IDE highlights lỗi ngay
- Giữ literal types (không bị widen)
- Pattern được dùng bởi Tailwind v4, Vite

❌ **Cons:**

- Chỉ catch compile-time, không validate JSON từ file
- User vẫn có thể bypass bằng `as any`

📊 **Effort:** Low

---

### Option D: JSON Schema + `style-gen doctor` Validation

Generate JSON Schema từ TypeScript types để validate `theme.json` trong lệnh `style-gen doctor`.

```bash
yarn style-gen doctor
# → Validates theme.json against JSON Schema
# → Reports missing required fields, wrong types
```

✅ **Pros:**

- Không thêm runtime deps vào library
- Doctor command là nơi tự nhiên để validate
- User nhận error cụ thể tại đúng nơi

❌ **Cons:**

- JSON Schema phải maintain song song TypeScript types
- Chỉ hữu ích khi user chạy `doctor`

📊 **Effort:** Medium

---

## 📦 GOAL 2: Bundle Size

### Option A: preserveModules + Subpath Exports ⭐ RECOMMENDED

Split bundle thành modules riêng biệt thay vì monolithic file.

```
dist/
├── index.js          # Full (backward compat)
├── plugin.js         # createStylePlugin only (~4 KB)
├── safelist.js       # generateSafelist only (~2 KB)
├── tokens.js         # createDesignTokens only (~3 KB)
├── cva.js            # createVariantMapper only (~1 KB)
└── spacing.js        # resolveSpacingProps only (~2 KB)
```

```typescript
// User imports only what they need
import { createStylePlugin } from "@duydpdev/style-generator/plugin";
import { generateSafelist } from "@duydpdev/style-generator/safelist";
```

✅ **Pros:**

- True tree-shaking — import 4 KB thay vì 12 KB
- Bundler (webpack/vite) chỉ include code dùng
- Standard pattern (Radix UI, shadcn, etc.)

❌ **Cons:**

- Breaking change cho current users (cần major version)
- Phải thêm `exports` map trong package.json
- Phức tạp hơn khi maintain

📊 **Effort:** Medium

---

### Option B: Move CLI deps ra khỏi main bundle

Tách `@clack/prompts` và `chokidar` hoàn toàn vào CLI bundle, không để chúng leak vào library code.

> **Phân tích:** Hiện tại cả 2 deps chỉ dùng trong `src/cli/`. Build đã tách CLI riêng qua `tsdown`. Cần verify không có accidental import trong library code.

✅ **Pros:**

- Library users không download CLI deps
- `dist/index.js` chỉ chứa pure logic
- Đơn giản thực hiện (kiểm tra imports)

❌ **Cons:**

- Có thể đã được handle sẵn
- Ít impactful nếu CLI bundle đã tách riêng

📊 **Effort:** Low

---

### Option C: Type-only Subpath

Tách type declarations thành `@duydpdev/style-generator/types` — chỉ chứa TypeScript interfaces, zero JS.

```typescript
// Framework config — chỉ cần types, không cần runtime
import type {
  ThemeConfig,
  InferColorKeys,
} from "@duydpdev/style-generator/types";
```

✅ **Pros:**

- User chỉ cần types không cần runtime code
- Giảm install footprint cho type-only consumers
- Pattern của Prisma, tRPC

❌ **Cons:**

- Niche use case
- Thêm complexity publish workflow

📊 **Effort:** Low-Medium

---

## 🚀 GOAL 3: Easy Setup

### Option A: Zero-Config Defaults ⭐ RECOMMENDED

Polish existing defaults — đảm bảo `createStyleSystem(themeConfig)` không cần options nào cho 80% use cases.

```typescript
// Current (verbose)
const { plugin, safelist } = createStyleSystem(themeConfig, {
  prefix: "tw",
  disableColorPrefix: false,
  // ...
});

// Zero-config
const { plugin, safelist } = createStyleSystem(themeConfig);
// → Sensible defaults cho everything
```

✅ **Pros:**

- 80% users chỉ cần 1 line
- Giảm learning curve đáng kể
- Options chỉ cần khi customize

❌ **Cons:**

- Defaults phải được document rõ ràng
- Breaking nếu thay đổi default values

📊 **Effort:** Low

---

### Option B: Tailwind v4 CSS Plugin Format

Thêm support cho Tailwind v4 CSS plugin format thay vì chỉ JS plugin.

```css
/* styles/theme.css */
@import "@duydpdev/style-generator/theme";
@theme {
  --color-primary: #3b82f6;
}
```

✅ **Pros:**

- v4 users không cần JS config
- Align với Tailwind v4's CSS-first philosophy
- Simpler mental model

❌ **Cons:**

- Major rework của plugin generation
- v3 users không benefit
- v4 API còn đang evolve

📊 **Effort:** High

---

### Option C: `create-style-system` Starter CLI

Publish separate `create-style-system` package để bootstrap full project.

```bash
yarn create style-system
# → Interactive prompts
# → Installs library + peer deps
# → Generates theme.json + tailwind config
# → Adds scripts to package.json
```

✅ **Pros:**

- First-time setup từ 0 → running trong 30 giây
- Pattern phổ biến (create-next-app, create-vite)
- Không ảnh hưởng main package

❌ **Cons:**

- Thêm 1 package phải maintain
- Overlap với `style-gen init`

📊 **Effort:** Medium

---

### Option D: VS Code Extension / IntelliSense Enhancement

Plugin VS Code để autocomplete theme keys trong className strings.

```tsx
// IDE suggests color keys inline
<div className="text-{cursor}" />
//                     ↑ shows: primary, secondary, accent...
```

✅ **Pros:**

- Massive DX improvement
- Users không cần memorize token names
- Differentiation factor vs competitors

❌ **Cons:**

- Separate repository + maintenance burden
- Very high effort
- Requires VS Code API knowledge

📊 **Effort:** Very High

---

## 💡 Recommendation — Lộ trình ưu tiên

| Priority | Option                                                        | Impact             | Effort | Version |
| -------- | ------------------------------------------------------------- | ------------------ | ------ | ------- |
| 🥇 1     | **Type C** — `defineTheme()` + `satisfies`                    | High type safety   | Low    | Minor   |
| 🥈 2     | **Bundle A** — Subpath exports (`/plugin`, `/tokens`, `/cva`) | -60% import size   | Medium | Major   |
| 🥉 3     | **Setup A** — Polish zero-config defaults                     | Less boilerplate   | Low    | Patch   |
| 4        | **Type D** — JSON Schema trong `doctor`                       | Runtime validation | Medium | Minor   |
| 5        | **Bundle B** — Verify CLI deps isolation                      | Bundle purity      | Low    | Patch   |
| 6        | **Setup B** — Tailwind v4 CSS plugin                          | Future-proof       | High   | Major   |

### Gợi ý thực hiện

1. **Ngay bây giờ (non-breaking):** `defineTheme()` + polish defaults → ship as patch/minor
2. **Next minor:** JSON Schema validation trong `doctor` command
3. **Next major:** Subpath exports + Tailwind v4 CSS support
