# Testing Guide

Tài liệu mô tả cách kiểm thử `@duydpdev/style-generator` 4.x. Code test là nguồn sự thật cho _từng ca_; tài liệu này chỉ giữ _các lớp test_, _vì sao_ mỗi lớp tồn tại và _chạy ở đâu_.

## CI/CD Pipeline

Hệ thống kiểm tra hai lớp:

1. **Local (pre-commit):** `Husky` + `lint-staged` chạy `eslint`, `prettier`, `tsc --noEmit` và `vitest run` trước khi commit. Husky được cài qua `postinstall` (Yarn Berry không chạy `prepare`).
2. **Remote (GitHub Actions, `.github/workflows/ci.yml`, PR vào `main`/`develop`):**
   - job `check`: commitlint → lint → `prettier:check` → `tsc` → kiểm cú pháp `scripts/*.mjs` và `site/scripts/*.mjs` → `build:all` → build site (`yarn workspace site build`) → typecheck 3 example, build `next-v4`/`nuxt-v4` → `check:externals` → `check:browser-safe` → `check:sizes` → `yarn test` → `yarn test:types`;
   - job `e2e`: Playwright trên Chromium và WebKit (`build:all` → cài browser → `yarn test:e2e`);
   - job `tailwind-floor`: pin các package Tailwind về `~4.1.0` (chỉ trong checkout của runner) rồi chạy `yarn test` + `yarn test:e2e`, để peer `tailwindcss >=4.1.0` thực sự được kiểm — lockfile đang giải ở bản 4.3.x nên nếu không có job này ngưỡng dưới không bao giờ được chạm tới.
   - `e2e` và `tailwind-floor` chỉ chạy khi PR đổi file ngoài `documents/**` (job `changes`); PR chỉ đổi tài liệu bỏ qua cả hai.

`check:publish-target` chạy trong `prepublish` và trong workflow publish (`deploy.yml`), xem [`deploy.md`](./deploy.md).

---

## Các lớp test

### 1. Unit test (Vitest)

```bash
yarn test                                                   # toàn bộ *.test.ts
yarn test:watch                                             # chế độ watch
yarn test:coverage                                          # v8 coverage
yarn vitest run src/features/registry/generateSourceInline.test.ts   # một file
```

Test nằm cạnh code (`*.test.ts`). Nhóm chính:

- `src/core/*` — `generate()`, `ThemeSchema` (key lạ, giá trị không an toàn, alias, `themeAxes`, tên số nguyên, key không round-trip, va chạm `borderWidth`/`colors`), `defineTheme`, kiểm tra option (`extraSources`, `screens`, `breakpoints`, `spacing.properties`), thử inject (cả `generateThemeCss`).
- `src/features/registry/*` — descriptor, `flattenByCategory`, `generateSourceInline` (kể cả state lines).
- `src/features/{theme-css,typography,spacing}/*` — từng khối CSS được sinh.
- `src/features/{tokens,cva}/*` — `createDesignTokens`, `createVariantMapper` (`{ states }`).
- `src/features/{vite,next}/*` — plugin (emit-only, watcher, path guard).
- `src/cli/*` — `init`, `generate`, `schema`, `doctor` (cảnh báo va chạm utility), `config`.
- `src/shared/*` — `helpers` (kebab/camel), `resolveSafePath`, `writeFileAtomic`.

Coverage dùng provider v8 và loại trừ `dist/` cùng file test; không có ngưỡng bắt buộc trong `vitest.config.ts`.

### 2. Type test (`*.test-d.ts`)

```bash
yarn test:types      # vitest typecheck --run src/**/*.test-d.ts
```

Dùng `expectTypeOf` để khoá suy luận kiểu: `DesignTokens.Web.*`, `ColorVariant<T>` …, `ThemeConfig`, chữ ký `createVariantMapper` (một `true` sót lại ở tham số thứ ba phải là lỗi TS), `resolveSpacing`/`ResponsiveValueStrict`, kiểu config mà `styleGenNext` trả về (object hay dạng hàm), và các subpath export (`src/exports/subpath-exports.test-d.ts`).

```typescript
import { describe, it, expectTypeOf } from "vitest";
import type { CamelCase } from "./inference";

describe("CamelCase", () => {
  it("converts kebab-case with numeric suffix", () => {
    expectTypeOf<CamelCase<"blue-500">>().toEqualTypeOf<"blue500">();
  });
});
```

### 3. Integration test (`src/__integration__/`)

Chạy trong Vitest nhưng đưa `generate().css` qua **engine Tailwind v4 thật** (`@tailwindcss/node`), thông qua một helper duy nhất `compileFixtureCss` — API `compile()` không phải public API nên chỉ có một chỗ gọi nó.

Các mối quan tâm được khoá ở đây:

- CSS biên dịch ra đúng class/biến; `@source inline` là thứ làm các class xuất hiện dù danh sách candidate rỗng (có đối chứng âm khi bỏ nó đi).
- Vòng tròn CVA: mọi class mà `createVariantMapper` trả về đều có trong CSS đã biên dịch.
- Parity `toKebabCase` giữa runtime và kiểu (`kebab-parity`).
- `themeAxes` nhiều trục trên theme thật của `examples/nuxt-v4`.
- Mọi `theme.json` trong `examples/`/`site/` đều qua `ThemeSchema` strict và các `theme.schema.json` đã commit khớp `z.toJSONSchema(ThemeSchema)`.
- Mẫu `THEME_JSON`/`THEME_CSS` trên landing site (`site-build-sample.test.ts`) là theme hợp lệ và là đoạn trích đúng thứ tự của `generate().css` thật.
- Options không mặc định (`custom-options.test.ts`): `screens`/`breakpoints` tuỳ chỉnh, `spacing.properties`, `cssVarDriven`, `enableResponsive: false`, `spacing.enabled: false`.
- Các script đo/kiểm ngân sách CSS (`measure-css-output`, `diff-class-families`, `check-css-budget`) có test riêng.

### 4. E2E (Playwright, Chromium + WebKit)

```bash
yarn build:all        # e2e import mã nguồn nhưng CI luôn build trước
yarn playwright install chromium webkit   # lần đầu
yarn test:e2e
```

Chỉ những hành vi phụ thuộc engine trình duyệt mới nằm ở đây (`e2e/`):

- `spacing-inheritance.spec.ts` — `@property … inherits: false`: biến `--sg-sp-*` của phần tử cha không rò xuống phần tử con (quy tắc _cùng phần tử_).
- `custom-breakpoint-spacing.spec.ts` — chuỗi fallback spacing ở breakpoint tuỳ chỉnh (md 800px, xl 1300px).
- `multi-axis-precedence.spec.ts` — khi hai trục cùng override một token, trục khai báo sau thắng.

Lý do chạy cả WebKit: ngữ nghĩa kế thừa của `@property` và cascade `var()` khác nhau giữa các engine.

### 5. Gate kiểm tra artifact (`scripts/*.mjs`)

Chạy sau `yarn build:all`, cũng nằm trong `prepublish`:

| Script                                                | Kiểm tra                                                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `yarn check:externals`                                | `dist/` không inline bất kỳ dependency/peer nào                                                                       |
| `yarn check:browser-safe`                             | `./tokens`, `./cva`, `./spacing`, `./types` không kéo Zod, Node built-in hay `@tailwindcss/*` (kể cả qua chunk chung) |
| `yarn check:sizes`                                    | ngân sách gzip cho từng subpath trong `package.json#exports`, tính cả mọi chunk mà entry import (transitive)          |
| `yarn check:publish-target`                           | publish đúng GitHub Packages                                                                                          |
| `scripts/check-css-budget.mjs` (không có yarn script) | ngân sách gzip cho CSS đã biên dịch của một app tiêu dùng; script thuần Node, copy được sang repo khác                |

---

## Viết test mới

1. Đặt `${name}.test.ts` (hoặc `${name}.test-d.ts` cho type test) cạnh file được test.
2. Test **hành vi** (biên, bất biến, lỗi), không test wiring hay chép lại implementation.
3. Cần CSS biên dịch thật → dùng `compileFixtureCss`, không gọi `compile()` trực tiếp.
4. Chỉ thêm e2e khi hành vi phụ thuộc engine trình duyệt.

```typescript
import { describe, expect, it } from "vitest";
import { toKebabCase } from "./helpers";

describe("toKebabCase", () => {
  it("adds a dash at the letter→digit boundary", () => {
    expect(toKebabCase("blue500")).toBe("blue-500");
  });
});
```
