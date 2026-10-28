# Testing Guide

Tài liệu mô tả cách kiểm thử `@duydpdev/style-generator` 4.x. Code test là nguồn sự thật cho _từng ca_; tài liệu này chỉ giữ _các lớp test_, _vì sao_ mỗi lớp tồn tại và _chạy ở đâu_.

## CI/CD Pipeline

Hệ thống kiểm tra hai lớp:

1. **Local (pre-commit):** `Husky` + `lint-staged` chạy trên snapshot đã stage của các file code được stage: `eslint --fix` → `prettier --write` → `tsc --noEmit` → `vitest related --run` (chỉ test import file được stage). Husky được cài qua `postinstall` (Yarn Berry không chạy `prepare`).
2. **Remote (GitHub Actions, `.github/workflows/ci.yml`, PR vào `main`/`develop`/`release/**`):\*\*
   - job `check`: audit dependency production (chặn high/critical) và audit toàn bộ (chỉ log) → commitlint → `build:all` (đứng trước lint vì ESLint có kiểu cũng quét `examples/**`, vốn import thư viện đã build qua `link:../..`) → lint → `prettier:check` → `tsc` → kiểm cú pháp (`node --check`) và type (`yarn typecheck:scripts`) của `scripts/*.mjs` và `site/scripts/*.mjs` → build site (`yarn workspace site build`) → `yarn workspace site check:links` (link tương đối và `#anchor` trong markdown mà site render) → typecheck 4 example (`design-system-example`, `react-v4-example`, `next-v4-example`, `nuxt-v4-example`) → `yarn workspace design-system-example test` (test DX, xem [lớp 6](#6-test-dx-của-example-design-system)) → build `next-v4`/`nuxt-v4` → `check:externals` → `check:browser-safe` → `check:sizes` → `check:smoke` → `yarn check:types-pack` (đóng gói tarball rồi chạy `@arethetypeswrong/cli --profile node16`: ESM và CJS đều phải resolve ra đúng `.d.ts`/`.d.cts`) → smoke dev-server Vite (`node scripts/vite-dev-smoke.mjs`, hai kịch bản: (1) chỉ Vite ≥ 6 (Vite 5 không có lazy `buildStart`, kịch bản bị bỏ qua): `createServer()` không `listen()` rồi `transformRequest(..., { ssr: true })` — plugin đặt `perEnvironmentStartEndDuringDev: true` nên `buildStart` vẫn chạy và `theme.css` được ghi; (2) xoá `theme.css` của `examples/react-v4`, `await server.listen()` để `buildStart` ghi lại nó, rồi sửa theme (`examples/design-system/src/theme.json`) dưới dev server thật và chờ `theme.css` được ghi lại + `full-reload`) → `yarn typecheck:dist` (hai nửa: `tsconfig.dts-check.json` kiểm `dist/*.d.ts` và `dist/*.d.cts` với `skipLibCheck: false` dưới `module: ESNext` + Bundler; `tsconfig.dts-check.cjs.json` kiểm `dist/*.d.cts` như một consumer CommonJS thật — `module: node16`, `skipLibCheck: false`, file `scripts/dist-types.cjs.assert.cts` tự import qua tên package theo điều kiện `require`. Nửa CJS dùng `node16`, không dùng `nodenext`, vì từ TS 5.8 `nodenext` cho phép `require()` ESM và sẽ che `TS1479` trên peer ESM-only. `dist/vite.d.cts` là `vite.d.ts` với import `vite` viết lại thành `import type … assert { 'resolution-mode': 'import' }` (`scripts/cjs-declaration.mjs`); attw không resolve peer type nên không thay được bước này) → `yarn test:coverage` (fail nếu coverage tụt dưới `coverage.thresholds` trong `vitest.config.ts`) → `yarn test:types`;
   - job `e2e`: Playwright trên Chromium và WebKit (`build:all` → cài browser → `yarn test:e2e`);
   - job `tailwind-floor`: pin các package Tailwind về `~4.1.0` (chỉ trong checkout của runner) rồi chạy `yarn test` + `yarn test:e2e`, để peer `tailwindcss >=4.1.0` thực sự được kiểm — lockfile đang giải ở bản 4.3.x nên nếu không có job này ngưỡng dưới không bao giờ được chạm tới.
   - job `node-floor`: build và chạy `check:smoke` trên Node `20.19.0`, sàn của `engines.node` (các job khác chạy Node 22);
   - job `peer-matrix` (5 leg): build lib bằng toolchain đã commit, rồi ép **một** peer về bản mới nhất của **một** major qua `resolutions` (`vite` 5/6/8, `typescript` 6/7), assert bản đã resolve là `N.x`, rồi build `examples/react-v4`, (leg `vite`) smoke dev-server, typecheck example và `yarn typecheck:dist`, (leg `typescript`) `yarn test:types`. Leg của major đã công bố trong range phải xanh (đỏ là CI đỏ); leg `experimental` (hiện là TypeScript 7, chưa công bố) dùng `continue-on-error`. Kết quả quyết định range peer (sửa tay, xem `documents/plans/2026-10-06/issue-register-execution/reports/phase-05-peer-matrix.md`). Chỉ bản mới nhất của mỗi major được chạy; sàn của range (vd. `vite@5.0.0`) không được kiểm;
   - `e2e`, `tailwind-floor`, `node-floor` và `peer-matrix` chỉ chạy khi PR đổi file ngoài `documents/**` (job `changes`); PR chỉ đổi tài liệu bỏ qua cả bốn.

`check:publish-target` chạy trong `prepublish` và trong workflow publish (`deploy.yml`); `deploy.yml` chạy thêm `check:types-pack` ngay sau `build:all`, xem [`deploy.md`](./deploy.md).

---

## Các lớp test

### 1. Unit test (Vitest)

```bash
yarn test                                                   # toàn bộ *.test.ts
yarn test:watch                                             # chế độ watch
yarn test:coverage                                          # v8 coverage; fail dưới coverage.thresholds (vitest.config.ts)
yarn vitest run src/features/registry/generateSourceInline.test.ts   # một file
```

Test nằm cạnh code (`*.test.ts`). Nhóm chính:

- `src/core/*` — `generate()`, `ThemeSchema` (key lạ, giá trị không an toàn, alias, `themeAxes`, tên số nguyên, key không round-trip, va chạm `borderWidth`/`colors`, `fontWeight` 1–1000, key typography đè `sp-*`/`font-*`), `defineTheme`, kiểm tra option (`extraSources`, `screens`, `breakpoints`, `spacing.properties` dạng mảng), thử inject (cả `generateThemeCss`).
- `src/features/registry/*` — descriptor, `flattenByCategory`, `generateSourceInline` (kể cả state lines).
- `src/features/{theme-css,typography,spacing}/*` — từng khối CSS được sinh.
- `src/features/{tokens,cva}/*` — `createDesignTokens`, `createVariantMapper` (`{ states }`).
- `src/features/{vite,next}/*` — plugin (emit trong `buildStart`, `addWatchFile`, watcher, path guard, plugin không tham số đọc `style-gen.config.json`).
- `src/node/*` — runner Node dùng chung: `loadStyleGenConfig` (test chuyển từ `config.test.ts` cũ), `resolveProjectPath` (không viết lại dấu `/` đầu; theme ngoài root, `outDir` trong root), `themeEmitter` (nhãn từng bước, chỉ ghi khi nội dung đổi), `watchThemeFile` (đọc lại config; config sai giữ bản hợp lệ gần nhất), `resolvePluginTarget`.
- `src/cli/*` — `run.test.ts` gọi `runCli(args, cwd)` trực tiếp (registry, `--help` từng lệnh, flag lạ → mã 1, `budget` flag lỗi → mã 2) vì lệnh trả mã thoát chứ không gọi `process.exit`; `index.test.ts` chỉ kiểm `process.exitCode`; `init`, `generate` (gồm `--watch` với chokidar thật và test sửa config khi đang watch, V5-06), `schema`, `tokens` (module sinh ra được import lại và so với `createDesignTokens`), `budget` (đo gzip trên file/thư mục tạm, ba mã thoát, hai dòng `OK:`/`OVER BUDGET:`), `doctor` (cảnh báo va chạm utility, `aliasHints`, lỗi theme × options, config sai dừng sớm; `legacyColorVars` quét biến `--sg-<màu>` kiểu 4.x trên thư mục tạm).
- `src/shared/*` — `helpers` (kebab/camel), `writeFileAtomic`.

Coverage dùng provider v8 với `include: ["src/**/*.ts"]`, nên file không có test nào import (vd `src/cli/index.ts`) vẫn hiện với 0 % thay vì bị bỏ qua. Loại trừ file test (`*.test.ts`, `*.test-d.ts`), `*.d.ts` và `src/__integration__/**`. Chưa có ngưỡng bắt buộc. Mốc đo ngày 2026-10-06: statements 91.35 %, branches 83.2 %, functions 92.48 %, lines 91.58 %; `src/cli/index.ts` 0 %.

Bảng `text` gom theo thư mục (dòng `src/cli` rồi dòng `index.ts`), nên không `grep` theo đường dẫn file trên stdout; kiểm bằng `coverage/coverage-final.json`.

### 2. Type test (`*.test-d.ts`)

```bash
yarn test:types      # vitest run --typecheck.only (*.test-d.ts; `yarn test` không chạy chúng)
```

Dùng `expectTypeOf` để khoá suy luận kiểu: `DesignTokens.Web.*`, `ColorVariant<T>` …, `ThemeConfig`, chữ ký `createVariantMapper` (một `true` sót lại ở tham số thứ ba phải là lỗi TS), `resolveSpacing`/`ResponsiveValueStrict`, `SpacingProps`/`splitSpacingProps`/`themeAxisAttributes` (`src/features/recipes/*.test-d.ts`), kiểu config mà `styleGenNext` trả về (object hay dạng hàm), và các subpath export (`src/exports/subpath-exports.test-d.ts`).

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
- `themeAxes` nhiều trục trên theme thật của `examples/design-system` (`multi-axis.test.ts`; trục `theme` khai báo trước `palette`).
- Mọi `theme.json` trong `examples/`/`site/` đều qua `ThemeSchema` strict và các `theme.schema.json` đã commit (`examples/`, `examples/design-system/src/`, `site/src/theme/`) khớp `z.toJSONSchema(ThemeSchema)`.
- Không file nào trong `examples/{react-v4,next-v4,nuxt-v4}` trùng nội dung với file của app khác (`examples-dedup.test.ts`, allowlist rỗng): thứ gì dùng chung phải nằm ở `examples/design-system`.
- Mẫu `THEME_JSON`/`THEME_CSS` trên landing site (`site-build-sample.test.ts`) là theme hợp lệ và là đoạn trích đúng thứ tự của `generate().css` thật.
- Options không mặc định (`custom-options.test.ts`): `screens`/`breakpoints` tuỳ chỉnh, `spacing.properties`, `cssVarDriven`, `enableResponsive: false`, `spacing.enabled: false`.
- Các script đo/kiểm CSS (`measure-css-output`, `diff-class-families`) có test riêng; ngân sách gzip của CSS nay là lệnh CLI `style-gen budget`, được test trong tiến trình (`src/cli/commands/budget.test.ts`) thay cho script `check-css-budget.mjs` và test spawn-process cũ.
- Đối chứng âm cho gate publish (`publish-gates.test.ts`): dựng một `dist/` giả trong thư mục tạm, chép script vào `<root>/scripts/` rồi khẳng định `check:externals`, `check:sizes`, `check:browser-safe` thoát mã 1 khi inline dependency, thiếu sourcemap, thiếu budget, vượt budget (kể cả qua chunk) hay kéo Zod/Node built-in vào subpath browser-safe.

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

| Script                                                                     | Kiểm tra                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn check:externals`                                                     | không file nào trong `dist/` (entry, chunk chung, `dist/cli/index.mjs`) inline dependency/peer: đọc `sources` của mọi `dist/**/*.map` tìm `node_modules/<tên>/`; file JS thiếu sourcemap cũng làm gate fail. `tailwind-merge` (chỉ là devDependency, dùng trong test của `./recipes`) cũng bị cấm inline |
| `yarn check:browser-safe`                                                  | `./tokens`, `./cva`, `./spacing`, `./recipes`, `./types` không kéo Zod, Node built-in hay `@tailwindcss/*` (kể cả qua chunk chung)                                                                                                                                                                       |
| `yarn check:sizes`                                                         | ngân sách gzip cho từng subpath trong `package.json#exports`, tính cả mọi chunk mà entry import (transitive), và cho CLI `dist/cli/index.mjs` (`cli`)                                                                                                                                                    |
| `yarn check:publish-target`                                                | publish đúng GitHub Packages                                                                                                                                                                                                                                                                             |
| `yarn check:smoke` (CI, không nằm trong `prepublish`)                      | `import` + `require` mọi subpath qua tên package và so khớp tên export; `generate()` ESM/CJS cho cùng CSS; chạy CLI (`--version`, `schema`, `generate`, `init`, `tokens --help`, `budget --help`) và script TypeScript do `init` sinh ra                                                                 |
| `yarn check:types-pack` (CI và `deploy.yml`, không nằm trong `prepublish`) | `yarn pack` rồi `@arethetypeswrong/cli --profile node16` trên tarball: mọi subpath resolve đúng cả khi `import` (`.d.ts`) lẫn `require` (`.d.cts`, sinh bởi `scripts/emit-cts-types.mjs` ở bước cuối của `yarn build`); `moduleResolution: node10` không được hỗ trợ và nằm ngoài profile                |

### 6. Test DX của example `design-system`

```bash
yarn build:all                                  # package link dist/*.d.ts của thư viện
yarn workspace design-system-example typecheck  # tsc --noEmit
yarn workspace design-system-example test       # vitest run --typecheck
```

Gate này nằm ngoài `yarn test` gốc (`vitest.config.ts` loại `examples/**`) vì cần `dist/` đã build; CI chạy nó ngay sau bước typecheck example, trước khi build `next-v4`/`nuxt-v4`. Nó khoá trải nghiệm của người dùng thư viện ở đầu cuối:

- `tests/dx.test.ts` dùng TypeScript Compiler API: biên dịch `src/recipes/button.ts` với `theme.json` thật (không diagnostic), rồi với bản `theme.json` đã đổi tên `danger` → `dangerX` (chặn `host.getSourceFile` để thay nội dung JSON) và khẳng định có lỗi TS nằm đúng ở `src/recipes/button.ts` — tức là đổi tên một token trong theme làm hỏng recipe tại chỗ dùng nó, không phải ở runtime. Cùng file khẳng định `style-gen.config.json` (bản phản chiếu cho luồng CLI-only) khớp `options` trong `src/style-gen.options.ts`.
- `tests/dx.test-d.ts` (`expectTypeOf`): union `Intent` (tuple `intents`, bị `satisfies` ràng buộc theo theme), `BreakpointKeys<typeof options>` là `"md" | "lg"`, `Box` với `{ xl: 4 }` không compile, kiểu của `axisAttributes`.

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
