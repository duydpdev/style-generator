<!-- source: documents/testing.md sha256: 16c428a20b5a -->

# Hướng dẫn kiểm thử

Tài liệu này mô tả cách `@duydpdev/style-generator` 4.x được kiểm thử. Mã test là nguồn chân lý cho _từng trường hợp_; tài liệu này chỉ giữ lại các _lớp kiểm thử_,
_vì sao_ mỗi lớp tồn tại và _chúng chạy ở đâu_.

## Pipeline CI/CD

Các bước kiểm tra có hai lớp:

1. **Cục bộ (pre-commit):** `Husky` + `lint-staged` chạy trên snapshot đã stage của các file code đã stage:
   `eslint --fix` → `prettier --write` → `tsc --noEmit` → `vitest related --run` (chỉ các test import các file đã stage).
   Husky được cài qua `postinstall` (Yarn Berry không chạy `prepare`).
2. **Từ xa** (GitHub Actions, `.github/workflows/ci.yml` và `.github/workflows/ci-matrix.yml`, PR vào `main`/`develop`/`release/**`):
   - job `check`: audit dependency production (chặn high/critical) và audit đầy đủ (chỉ ghi log) → commitlint → `build:all` (trước lint vì ESLint nhận biết kiểu cũng quét
     `examples/**`, nơi import thư viện đã build qua `link:../..`) → `yarn workspace plain-nuxt-example prepare:nuxt` (ghi các file `.nuxt/tsconfig.*.json` mà ESLint cần cho
     `examples/plain-nuxt/app/**`) → lint → `prettier:check` → `tsc` → kiểm tra cú pháp (`node --check`) và kiểm tra kiểu (`yarn typecheck:scripts`) cho `scripts/*.mjs` và
     `site/scripts/*.mjs` → build site (`yarn workspace site build`) → `yarn workspace site check:links` (liên kết tương đối,
     liên kết tuyệt đối `https://github.com/duydpdev/style-generator/blob/main/…` như README.md viết,
     và các `#anchor` trong markdown mà site render) → `yarn check:docs-embed` (mã trong hướng dẫn bằng với các vùng ví dụ mà nó nhúng) → `yarn check:docs-i18n` (mỗi tài liệu được
     render có một twin `documents/vi/` với hash nguồn hiện tại và cùng các heading, marker và khối mã) → `yarn check:doc-snippets` (mọi khối `ts`/`tsx` trong tài liệu đều qua kiểm
     tra kiểu với `dist/*.d.ts`) → `yarn check:doc-exports` (mỗi export có một heading tham chiếu, một khối signature khớp và một TSDoc không rỗng,
     xem [lớp 9](#9-docs-embed-snippet-export)) → kiểm tra kiểu cho mọi workspace `*-example` và cho `site` (một lệnh `yarn workspaces foreach`;
     `tsconfig.json` gốc không bao gồm `site/`, nên đây là nơi duy nhất một kiểu prop sai trong `site/src` bị bắt) — nó cũng biên dịch các file kiểm tra kiểu của component mẫu,
     xem [lớp 8](#8-kiểm-tra-các-component-mẫu) → `yarn workspace design-system-example test` (DX test,
     xem [lớp 6](#6-dx-test-cho-ví-dụ-design-system)) → build các ứng dụng ví dụ (`plain-react`, `plain-nuxt`) → `check:externals` → `check:browser-safe` → `check:sizes` →
     `check:smoke` → `yarn check:types-pack` (đóng gói tarball rồi chạy `@arethetypeswrong/cli --profile node16`:
     cả ESM lẫn CJS đều phải resolve tới đúng `.d.ts`/`.d.cts`) → smoke test dev server của Vite (`node scripts/vite-dev-smoke.mjs`, hai kịch bản:
     (1) chỉ Vite ≥ 6 (Vite 5 không có `buildStart` lazy, nên kịch bản bị bỏ qua): `createServer()` không `listen()` rồi `transformRequest(..., { ssr: true })` — plugin đặt
     `perEnvironmentStartEndDuringDev: true`, nên `buildStart` vẫn chạy và `theme.css` được ghi; (2) xóa `theme.css` của `examples/harness`,
     `await server.listen()` để `buildStart` ghi lại nó, rồi sửa theme (`examples/design-system/src/theme.json`) dưới một dev server thật và chờ `theme.css` được ghi lại +
     `full-reload`) → `yarn typecheck:dist` (hai nửa: `tsconfig.dts-check.json` kiểm tra `dist/*.d.ts` và `dist/*.d.cts` với `skipLibCheck: false` dưới `module: ESNext` + Bundler;
     `tsconfig.dts-check.cjs.json` kiểm tra `dist/*.d.cts` như một consumer CommonJS thật — `module: node16`, `skipLibCheck: false`,
     file `scripts/dist-types.cjs.assert.cts` import qua tên package ngay dưới điều kiện `require`. Nửa CJS dùng `node16`, không phải `nodenext`,
     vì từ TS 5.8 `nodenext` cho phép `require()` một ESM và sẽ che mất `TS1479` trên một peer chỉ có ESM.
     `dist/vite.d.cts` là `vite.d.ts` với import `vite` được viết lại thành `import type … assert { 'resolution-mode': 'import' }` (`scripts/cjs-declaration.mjs`);
     attw không resolve các kiểu peer, nên không thể thay thế bước này) → `yarn test:coverage` (thất bại nếu coverage tụt dưới `coverage.thresholds` trong `vitest.config.ts`) →
     `yarn test:types`;
   - job `plain-react` (một job riêng của `ci.yml`, tên check `Plain React (Storybook + parity)`, được ruleset `main-develop` bắt buộc;
     nó chạy trên mọi PR kể cả PR draft và PR chỉ đổi tài liệu): `build:all` → `yarn playwright install --with-deps chromium` → `yarn workspace plain-react-example test` (các story
     và gate đối sánh plain-vs-harness dưới dạng các test trình duyệt của Vitest) → `yarn workspace plain-react-example storybook:build` →
     `node examples/plain-react/scripts/copy-out-smoke.mjs`;
   - job `plain-nuxt` (một job riêng của `ci.yml`, tên check `Plain Nuxt (Storybook)`, ruleset không bắt buộc; cùng điều kiện chạy với `plain-react`): `build:all` →
     `yarn workspace plain-nuxt-example prepare:nuxt` → `yarn playwright install --with-deps chromium` → `yarn workspace plain-nuxt-example test:stories`
     (các story dưới dạng test trình duyệt của Vitest; việc kiểm tra slot của `Button.vue` và kích thước icon-only chỉ được khẳng định ở đây);
   - job `e2e` (một job của `ci.yml`, tên check `E2E (Playwright)`, được ruleset `main-develop` bắt buộc; nó chạy trên mọi PR kể cả PR chỉ đổi tài liệu,
     bỏ qua PR draft và chạy lại khi `ready_for_review`): `build:all` → `yarn playwright install --with-deps chromium webkit` → `yarn test:e2e`;
   - job `tailwind-floor`: ghim các package Tailwind về `~4.1.0` (chỉ trong bản checkout của runner) rồi chạy `yarn test` + `yarn test:e2e`,
     để peer `tailwindcss ^4.1.0` thực sự được kiểm tra — lockfile hiện resolve tới 4.3.x, nên nếu không có job này thì cận dưới sẽ không bao giờ được chạm tới.
   - job `node-floor`: build và chạy `check:smoke` cùng `check:next-build` (một lần `next build` thật qua `styleGenNext`, `scripts/next-build-smoke.mjs`) trên Node `20.19.0`,
     mức sàn của `engines.node` (các job khác chạy Node 22);
   - job `peer-matrix` (4 nhánh): build thư viện bằng toolchain đã commit, rồi ép **một** peer về phiên bản mới nhất của **một** major qua `resolutions` (`vite` 5/6/8,
     `typescript` 6), khẳng định phiên bản được resolve là `N.x`, rồi build `examples/harness`, (nhánh `vite`) smoke test dev server, kiểm tra kiểu ví dụ và `yarn typecheck:dist`,
     (nhánh `typescript`) `yarn test:types`. Mọi nhánh đều phải xanh (đỏ nghĩa là CI đỏ); không còn nhánh `experimental` nào nữa:
     nhánh TypeScript 7 đã bị bỏ vì Yarn 4.10 không cài được TypeScript 7 native. Kết quả quyết định các khoảng peer (được sửa tay).
     Chỉ phiên bản mới nhất của mỗi major được chạy; mức sàn của một khoảng (ví dụ `vite@5.0.0`) không được kiểm tra;
   - job `ui-peer-floor`: build thư viện, ép bốn optional peer của UI kit (`class-variance-authority`, `clsx`, `tailwind-merge`,
     `@types/react`) về mức sàn của các khoảng `peerDependencies` qua `resolutions`, khẳng định các phiên bản được resolve,
     rồi chạy `yarn typecheck:dist` và `yarn vitest run src/features/ui`. Hai bản ghim chỉ dành cho harness (bộ ví dụ dùng để kiểm thử DX) phản ánh những gì một consumer thực sự
     nhận được: cva 0.7.0 cần đúng clsx 2.0.0, nên nó giữ một bản sao lồng nhau riêng, và `@types/scheduler` được giữ ở 0.16.8, phiên bản cuối cùng có `scheduler/tracing`,
     thứ mà `@types/react` <=18.2.71 import;
   - `tailwind-floor`, `node-floor`, `peer-matrix` và `ui-peer-floor` là tầng nặng và nằm trong `ci-matrix.yml` (7 job, `peer-matrix` có 4 leg; không phải check bắt buộc).
     Nó chạy hằng đêm trên `main` (cron `43 5 * * *`), khi dispatch thủ công (`gh workflow run ci-matrix.yml --ref main`) và trên các PR vào `main`/`release/**`,
     không chạy trên PR vào `develop`; mọi leg phải xanh trước khi merge PR vào `main`. Nó có `paths-ignore: ["documents/**"]` ở cấp workflow:
     một PR chỉ đổi tài liệu không chạy nó. Trên PR, mọi job bỏ qua các PR draft và chạy khi PR được đánh dấu ready (`ready_for_review`);
     với `schedule` và `workflow_dispatch` không có draft, nên điều kiện là `github.event_name != 'pull_request' || github.event.pull_request.draft == false`.
     Tầng theo từng PR (`check`, `plain-react`, `e2e`) nằm trong `ci.yml`, trong đó job `check` cũng chạy trên các PR draft,
     nên một draft đã push luôn có kết quả (phút Actions miễn phí trên repo công khai này).

`check:publish-target` chạy trong `prepublish` và trong workflow publish (`deploy.yml`); `deploy.yml` còn chạy thêm `check:types-pack` ngay sau `build:all`, xem [`deploy.md`](./deploy.md).

Hai workflow riêng biệt chụp ảnh màn hình site đã build: `.github/workflows/visual.yml` (job `Site visual regression (chromium)`) chỉ so sánh với các baseline Linux đã commit và
chạy cho các PR không phải draft có đổi `site/**`, `examples/**`, `e2e-site/**`, `src/**`, `documents/**` (site render chúng), `package.json`, `yarn.lock`,
`playwright.site.config.ts` hoặc chính `.github/workflows/visual.yml`; `.github/workflows/visual-update.yml` (job `Site visual baselines (chromium)`) chỉ chạy khi nhãn
`visual-update` được thêm vào và ghi lại các baseline. Xem [lớp 7](#7-kiểm-thử-hồi-quy-giao-diện-site-playwright-chromium).

---

## Bảng gate

Mỗi gate một lần. `yarn verify` = gate cơ sở + gate `src/**` (`build:all`, `check:tokens`, `lint`, `prettier:check`, `tsc`, `test`, `test:types`, `typecheck:scripts`, `typecheck:dist`,
`check:externals`, `check:sizes`, `check:browser-safe`, `check:publish-target`, `check:smoke`, `check:types-pack`, `vite-dev-smoke`); chuỗi gate của tài liệu nằm trong bảng.

| Lệnh                                                                            | Chặn cái gì                                                                                                            | Chạy ở (workflow: bước)                                        | Cần sau khi đổi                                                               |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `yarn lint`                                                                     | lỗi và cảnh báo ESLint (không cho phép cảnh báo nào), directive disable thừa                                           | `check`: Lint                                                  | mọi thay đổi                                                                  |
| `yarn prettier:check`                                                           | file chưa được định dạng                                                                                               | `check`: Prettier check                                        | mọi thay đổi                                                                  |
| `yarn tsc --noEmit`                                                             | lỗi kiểu trong `src/**`, test và config                                                                                | `check`: Type Check                                            | mọi thay đổi                                                                  |
| `yarn test`                                                                     | test đơn vị và tích hợp thất bại                                                                                       | `check`: Test (`test:coverage`, có ngưỡng)                     | mọi thay đổi                                                                  |
| `yarn test:types`                                                               | test kiểu `*.test-d.ts` thất bại                                                                                       | `check`: Type tests                                            | kiểu trong `src/**`                                                           |
| `yarn test:e2e`                                                                 | spacing, CSS được sinh, `@source inline` và `themeAxes` trong một trình duyệt thật                                     | `e2e`: Run e2e tests                                           | `src/**`, CSS được sinh                                                       |
| `yarn test:visual`                                                              | pixel của site đã build thay đổi (sau `yarn site:build`)                                                               | `visual.yml`: Compare with the committed baselines             | `site`, `documents/**`                                                        |
| `yarn typecheck:scripts`                                                        | lỗi kiểu trong `scripts/*.mjs` và `site/scripts/*.mjs`                                                                 | `check`: Script syntax and type check                          | `scripts/*.mjs`                                                               |
| `yarn typecheck:dist`                                                           | `dist/*.d.ts` (ESM) và `dist/*.d.cts` (CJS) không qua được kiểm tra kiểu khi bật library checking                      | `check`; `peer-matrix`; `ui-peer-floor`; `deploy.yml`          | `src/**`, config build                                                        |
| `yarn check:tokens`                                                             | một `theme.tokens.ts` được commit (plain-react, plain-nuxt, design-system, site) không còn khớp theme và config của nó | `check`: Check committed tokens                                | `theme.json`, `style-gen.config.json`, `src/**`                               |
| `yarn check:externals`                                                          | một module bên thứ ba bị inline vào `dist`, hoặc một UI peer bị chạm tới ngoài `./ui`                                  | `check`: Check externals; `deploy.yml`                         | `src/**`, config build                                                        |
| `yarn check:sizes`                                                              | một subpath hoặc CLI vượt ngân sách gzip                                                                               | `check`: Check size budgets; `deploy.yml` (qua `prepublish`)   | `src/**`, config build                                                        |
| `yarn check:browser-safe`                                                       | một subpath trình duyệt chạm tới Zod, một builtin của Node hoặc một runtime dependency                                 | `check`: Check browser-safe subpaths; `deploy.yml`             | `src/**`, config build                                                        |
| `yarn check:publish-target`                                                     | registry publish khác npmjs.org, hoặc access khác `public`                                                             | `deploy.yml`: Verify publish target; `prepublish`              | `package.json`, `.yarnrc.yml`                                                 |
| `yarn check:smoke`                                                              | thiếu file `dist`, một subpath không nạp được bằng `import` hoặc `require`, CLI hỏng                                   | `check`: Smoke-run built artifacts; `node-floor`; `deploy.yml` | `src/**`, config build                                                        |
| `yarn check:next-build`                                                         | `styleGenNext` hỏng trong một lần `next build` thật (nạp config qua `require`, chọn phase, CSS được sinh)              | `node-floor`: Next build smoke                                 | `src/features/next/**`, `src/node/**`, config build                           |
| `yarn check:types-pack`                                                         | một subpath có kiểu không resolve được cho người dùng ESM và CJS (attw, node16)                                        | `check`: Check types resolve for ESM and CJS; `deploy.yml`     | `src/**`, `package.json#exports`                                              |
| `node scripts/vite-dev-smoke.mjs`                                               | một dev server `styleGenVite` không ghi hoặc không emit lại `theme.css`                                                | `check`: Vite dev-server smoke; `peer-matrix` (các nhánh vite) | `src/features/vite/**`                                                        |
| `yarn site:build`                                                               | build site hoặc harness thất bại (site render `documents/*.md`)                                                        | `check`: Build site; `visual.yml`                              | `site`, `documents/**`, `examples/**`                                         |
| `yarn workspace site check:links`                                               | link tương đối và `#anchor` hỏng trong các doc được render và bản twin của chúng                                       | `check`: Check doc links                                       | `documents/**`, `README.md`                                                   |
| `yarn check:docs-embed`                                                         | một block code nhúng khác vùng nguồn của nó                                                                            | `check`: Check embedded doc code                               | `documents/**`, `examples/**`                                                 |
| `yarn check:docs-i18n`                                                          | một bản twin tiếng Việt bị thiếu, cũ hoặc khác cấu trúc                                                                | `check`: Check the Vietnamese docs mirror                      | `documents/**`, `README.md`                                                   |
| `yarn check:doc-snippets`                                                       | một block `ts`/`tsx` trong doc không qua được kiểm tra kiểu, hoặc số block opt-out vượt 10%                            | `check`: Type-check doc snippets                               | `documents/**`, `README.md`                                                   |
| `yarn check:doc-exports`                                                        | một export công khai thiếu heading tham chiếu, signature block hoặc TSDoc                                              | `check`: Check reference coverage of exports                   | export trong `src/**`, `documents/reference/**`                               |
| `yarn check:plain-ui`                                                           | một thư mục component plain vi phạm quy tắc layout hoặc import                                                         | `check`: Check plain UI folders                                | `examples/plain-*`                                                            |
| `yarn workspaces foreach -A --include '*-example' --include site run typecheck` | lỗi kiểu trong các app ví dụ và site so với thư viện đã build                                                          | `check`: Typecheck examples                                    | `examples/**`, `site/**`, kiểu trong `src/**`                                 |
| `yarn workspace site typecheck`                                                 | lỗi kiểu trong `site/**` (cũng được dòng trên bao phủ)                                                                 | `check`: Typecheck examples                                    | `site/**`                                                                     |
| `yarn workspace design-system-example test`                                     | một recipe không biên dịch lỗi, trong `src/recipes/button.ts`, khi theme bị đột biến (DX của design-system)            | `check`: Test examples (design-system DX)                      | `examples/design-system/**`, kiểu của theme                                   |
| `yarn workspace plain-react-example test`                                       | một story Storybook lỗi hoặc class của các component plain lệch so với `harness-example/ui`                            | `plain-react`: Stories and parity gate (Vitest browser)        | `examples/plain-react/**`, `examples/harness/**`, `examples/design-system/**` |
| `node examples/plain-react/scripts/copy-out-smoke.mjs`                          | một thư mục `src/ui/button/` được chép ra không qua được kiểm tra kiểu chỉ với tarball đã pack và các peer của nó      | `plain-react`: Copy-out smoke (packed tarball + peers only)    | `examples/plain-react/src/ui/**`, `src/features/ui/**`                        |

Mọi script `check:*` đều chạy trong CI hoặc trong `yarn verify`: không có gate nào phụ thuộc vào việc con người nhớ chạy.

## Các lớp kiểm thử

### 1. Kiểm thử đơn vị (Vitest)

```bash
yarn test                                                   # all *.test.ts
yarn test:watch                                             # watch mode
yarn test:coverage                                          # v8 coverage; fails below coverage.thresholds (vitest.config.ts)
yarn vitest run src/features/registry/generateSourceInline.test.ts   # a single file
```

Test nằm cạnh mã (`*.test.ts`). Các nhóm chính:

- `src/core/*` — `generate()`, `ThemeSchema` (key lạ, giá trị không an toàn, alias, `themeAxes`, tên là số nguyên, key không round-trip, xung đột `borderWidth`/`colors`,
  `fontWeight` 1–1000, key typography che khuất `sp-*`/`font-*`), `defineTheme`, `parseAlias`, `forEachAxisVariant`,
  kiểm tra hợp lệ tùy chọn (key đã bị gỡ như `extraSources`/`axes` → `unrecognized_keys`, `screens`,
  `breakpoints`, `spacing.properties` dạng mảng), các thử nghiệm injection (kể cả `generateThemeCss`).
- `src/features/registry/*` — descriptor, `flattenByCategory`, `generateSourceInline` (kể cả các dòng trạng thái).
- `src/features/{theme-css,typography,spacing}/*` — từng khối CSS được sinh ra.
- `src/features/{tokens,cva}/*` — `createDesignTokens`, `createVariantMapper` (`{ states }`).
- `src/features/{vite,next}/*` — các plugin (emit trong `buildStart`, `addWatchFile`, watcher, bộ bảo vệ đường dẫn, plugin không đối số đọc `style-gen.config.json`).
- `src/node/*` — Node runner dùng chung: `loadStyleGenConfig` (các test được chuyển từ `config.test.ts` cũ), `resolveProjectPath` (không viết lại dấu `/` đứng đầu;
  theme nằm ngoài thư mục gốc, `output`/`tokensOutput` nằm trong thư mục gốc), `themeEmitter` (nhãn theo từng giai đoạn, chỉ ghi khi nội dung thay đổi), `watchThemeFile` (đọc lại config;
  một config không hợp lệ giữ lại config hợp lệ gần nhất), `resolvePluginTarget`, `writeFileAtomic`, `errorMessage`, `isPlainObject`.
- `src/cli/*` — `run.test.ts` gọi trực tiếp `runCli(args, cwd)` (registry, `--help` theo từng lệnh, flag lạ → mã 1,
  flag không hợp lệ của `budget` → mã 2) vì các lệnh trả về một mã thoát thay vì gọi `process.exit`; `index.test.ts` chỉ kiểm tra `process.exitCode`; `init`,
  `generate` (kể cả `--watch` với chokidar thật và một test sửa config trong khi đang theo dõi, V5-06), `schema`,
  `tokens` (module được sinh ra được import lại và so sánh với `createDesignTokens`), `budget` (đo gzip trên các file/thư mục tạm, ba mã thoát, hai dòng `OK:`/`OVER BUDGET:`),
  `doctor` (cảnh báo xung đột utility, `aliasHints`, lỗi theme × options, một config không hợp lệ dừng sớm;
  `legacyColorVars` quét các biến `--sg-<color>` kiểu 4.x trong một thư mục tạm).
- `src/shared/*` — `helpers` (kebab/camel), `axisAttributeName`, `cssBlock`.

Coverage dùng provider v8 với `include: ["src/**/*.ts"]`, nên một file mà không test nào import (ví dụ `src/cli/index.ts`) vẫn hiện ở mức 0 % thay vì bị bỏ qua.
Các file test (`*.test.ts`, `*.test-d.ts`), `*.d.ts` và `src/__integration__/**` bị loại trừ. Hiện chưa có ngưỡng bắt buộc.
Baseline đo ngày 2026-10-06: statements 91.35 %, branches 83.2 %, functions 92.48 %, lines 91.58 %; `src/cli/index.ts` 0 %.

Bảng `text` gom nhóm theo thư mục (dòng `src/cli` rồi đến dòng `index.ts`), nên đừng `grep` theo đường dẫn file trên stdout; hãy kiểm tra `coverage/coverage-final.json`.

### 2. Kiểm thử kiểu (`*.test-d.ts`)

```bash
yarn test:types      # vitest run --typecheck.only (*.test-d.ts; `yarn test` does not run them)
```

Dùng `expectTypeOf` để khóa chặt việc suy luận kiểu: `DesignTokens.Web.*`, `ColorVariant<T>` …, `ThemeConfig`,
chữ ký của `createVariantMapper` (một `true` còn sót ở tham số thứ ba phải là một lỗi TS), `resolveSpacing`/`ResponsiveValueStrict`,
`SpacingProps`/`splitSpacingProps`/`themeAxisAttributes` (`src/features/recipes/*.test-d.ts`), kiểu config mà `styleGenNext` trả về (dạng object hoặc dạng hàm),
và các export theo subpath (`src/exports/subpath-exports.test-d.ts`).

<!-- snippet: no-check imports repo-internal src/ modules -->

```typescript
import { describe, it, expectTypeOf } from "vitest";
import type { CamelCase } from "./inference";

describe("CamelCase", () => {
  it("converts kebab-case with numeric suffix", () => {
    expectTypeOf<CamelCase<"blue-500">>().toEqualTypeOf<"blue500">();
  });
});
```

### 3. Kiểm thử tích hợp (`src/__integration__/`)

Chúng chạy trong Vitest nhưng cho `generate().css` đi qua **engine Tailwind v4 thật** (`@tailwindcss/node`),
qua một helper duy nhất `compileFixtureCss` — API `compile()` không phải API công khai, nên chỉ có một nơi gọi nó.

Những mối quan tâm được khóa chặt ở đây:

- CSS đã biên dịch có đúng class/biến; `@source inline` là thứ khiến các class xuất hiện ngay cả khi danh sách candidate rỗng (kèm một negative control gỡ nó đi).
- Vòng đi-về của CVA: mọi class mà `createVariantMapper` trả về đều có mặt trong CSS đã biên dịch.
- Sự tương đương của `toKebabCase` giữa runtime và kiểu (`kebab-parity`).
- `themeAxes` nhiều trục trên theme thật của `examples/design-system` (`multi-axis.test.ts`; trục `theme` được khai báo trước `palette`).
- Mọi `theme.json` trong `examples/`/`site/` đều qua `ThemeSchema` nghiêm ngặt, và các file `theme.schema.json` đã commit (`examples/`, `examples/design-system/src/`,
  `site/src/theme/`) khớp với `z.toJSONSchema(ThemeSchema)`.
- Các ứng dụng plain chia sẻ file có chủ đích; `yarn check:plain-ui` kiểm tra chúng. Code mà harness và một ứng dụng plain cùng cần nằm trong `examples/design-system` hoặc được sao chép có chủ đích.
- Các mẫu `THEME_JSON`/`THEME_CSS` trên landing site (`site-build-sample.test.ts`) là một theme hợp lệ và một đoạn trích, đúng thứ tự, của `generate().css` thật.
- Các tùy chọn không mặc định (`custom-options.test.ts`): `screens`/`breakpoints` tùy biến, `spacing.properties`, `cssVarDriven`, `enableResponsive: false`, `spacing.enabled: false`.
- Các script đo/kiểm tra CSS (`measure-css-output`, `diff-class-families`) có test riêng; ngân sách gzip của CSS giờ là lệnh CLI `style-gen budget`,
  được kiểm thử trong cùng process (`src/cli/commands/budget.test.ts`) thay cho script `check-css-budget.mjs` và test spawn-process cũ.
- Các negative control cho các gate publish (`publish-gates.test.ts`): dựng một `dist/` giả trong một thư mục tạm, chép các script vào `<root>/scripts/`,
  rồi khẳng định `check:externals`, `check:sizes` và `check:browser-safe` thoát với mã 1 khi có một dependency bị inline, thiếu sourcemap, thiếu ngân sách,
  vượt ngân sách (kể cả qua một chunk), hoặc Zod/built-in của Node bị kéo vào một subpath an toàn cho trình duyệt.

### 4. E2E (Playwright, Chromium + WebKit)

```bash
yarn build:all        # e2e imports source code, but CI always builds first
yarn playwright install chromium webkit   # first time only
yarn test:e2e
```

Trong CI đây là job `e2e` của `ci.yml` (mọi PR) và một bước của leg `tailwind-floor` thuộc tầng nặng.

Chỉ những hành vi phụ thuộc vào engine trình duyệt nằm ở đây (`e2e/`):

- `spacing-inheritance.spec.ts` — `@property … inherits: false`: các biến `--sg-sp-*` của phần tử cha không rò xuống phần tử con (quy tắc _cùng phần tử_).
- `custom-breakpoint-spacing.spec.ts` — chuỗi giá trị dự phòng của spacing tại các breakpoint tùy biến (md 800px, xl 1300px).
- `multi-axis-precedence.spec.ts` — khi hai trục override cùng một token, trục khai báo sau thắng.

Vì sao cũng dùng WebKit: ngữ nghĩa kế thừa của `@property` và cascade `var()` khác nhau giữa các engine.

### 5. Các gate kiểm tra artifact (`scripts/*.mjs`)

Chạy sau `yarn build:all`, và cũng là một phần của `prepublish`:

| Script                                                                 | Nó kiểm tra gì                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yarn check:externals`                                                 | không file nào trong `dist/` (các entry, chunk dùng chung, `dist/cli/index.mjs`) inline một dependency/peer: nó đọc `sources` của mọi `dist/**/*.map` để tìm `node_modules/<name>/`; một file JS không có sourcemap cũng làm gate thất bại. Lượt thứ hai duyệt các import tương đối của từng entry: chỉ `./ui` được import `class-variance-authority`, `clsx` hoặc `tailwind-merge`, và không entry nào import `react` lúc runtime |
| `yarn check:browser-safe`                                              | `./tokens`, `./cva`, `./spacing`, `./recipes`, `./types`, `./ui`, `./ui-react` không kéo theo Zod, built-in của Node hay `@tailwindcss/*` (kể cả qua các chunk dùng chung)                                                                                                                                                                                                                                                         |
| `yarn check:sizes`                                                     | ngân sách gzip cho mọi subpath trong `package.json#exports`, tính mọi chunk mà entry import (bắc cầu), và cho CLI `dist/cli/index.mjs` (`cli`)                                                                                                                                                                                                                                                                                     |
| `yarn check:publish-target`                                            | publish tới npmjs.org với access public, và không có khối scope `.yarnrc.yml` nào chuyển hướng `@duydpdev` đi nơi khác                                                                                                                                                                                                                                                                                                             |
| `yarn check:smoke` (CI, không thuộc `prepublish`)                      | `import` + `require` mọi subpath theo tên package và khớp tên export; `generate()` ở ESM/CJS cho cùng một CSS; chạy CLI (`--version`, `schema`, `generate`, `tokens --help`, `budget --help`, và `init` trong một dự án rỗng — phương án dự phòng `style-gen generate`, không có script generator, rồi `generate` — và cạnh một `vite.config.ts` — đoạn mã `styleGenVite()`)                                                       |
| `yarn check:types-pack` (CI và `deploy.yml`, không thuộc `prepublish`) | `yarn pack` rồi `@arethetypeswrong/cli --profile node16` trên tarball: mọi subpath resolve đúng ở cả `import` (`.d.ts`) lẫn `require` (`.d.cts`, được `scripts/emit-cts-types.mjs` sinh ra ở bước cuối của `yarn build`); `moduleResolution: node10` không được hỗ trợ và nằm ngoài profile                                                                                                                                        |

### 6. DX test cho ví dụ `design-system`

```bash
yarn build:all                                  # the package links the library's dist/*.d.ts
yarn workspace design-system-example typecheck  # tsc --noEmit
yarn workspace design-system-example test       # vitest run --typecheck
```

Gate này nằm ngoài `yarn test` gốc (`vitest.config.ts` loại trừ `examples/**`) vì nó cần một `dist/` đã build; CI chạy nó ngay sau bước kiểm tra kiểu ví dụ,
trước khi build các ứng dụng ví dụ. Nó khóa chặt trải nghiệm đầu-cuối của người dùng thư viện:

- `tests/dx.test.ts` dùng TypeScript Compiler API: nó biên dịch `src/recipes/button.ts` với `theme.json` thật (không có diagnostic nào),
  rồi với một `theme.json` trong đó `danger` được đổi tên thành `dangerX` (chặn `host.getSourceFile` để thay nội dung JSON),
  và khẳng định một lỗi TS rơi đúng vào `src/recipes/button.ts` — tức là đổi tên một token trong theme làm hỏng recipe đúng tại nơi dùng nó, không phải lúc runtime.
  Cùng file đó khẳng định độ phủ opacity của `style-gen.config.json` bằng với độ phủ trong `package.json#style-gen` của harness, và theme cùng các tùy chọn generator của config vượt qua kiểm tra hợp lệ của `generate()`.
- `tests/dx.test-d.ts` (`expectTypeOf`): union `Intent` (tuple `intents`, bị ràng buộc bởi `satisfies` với theme), các key breakpoint của token được sinh ra là `"md" | "lg"`,
  `Box` với `{ xl: 4 }` không biên dịch được, kiểu của `axisAttributes`.

### 7. Kiểm thử hồi quy giao diện site (Playwright, Chromium)

```bash
yarn site:build              # the suite screenshots the BUILT site (vite preview, port 4173)
yarn test:visual             # compare against the committed baselines
yarn test:visual:update      # rewrite changed/missing baselines (--update-snapshots=changed)
```

`playwright.site.config.ts` (tách khỏi `playwright.config.ts` để `yarn test:e2e` không cần server) chạy `e2e-site/site.spec.ts`: 3 route (`/`, `/docs/architecture`,
`/examples` → `/examples/v4` với iframe `harness`) × 3 viewport (375×812, 768×1024, 1280×800) × theme `light`/`dark` (đặt qua `localStorage["sg-site-theme"]` bằng `addInitScript`).
Ảnh toàn trang được cắt thành các lát 1800 px (`-p0`, `-p1`, …): Chromium không thể tạo một ảnh cao hơn 16384 px,
và 1800 px (khoảng hai viewport desktop) giữ cho mỗi ô baseline đủ dễ đọc khi review và một diff cục bộ trong ô của nó.
Ngưỡng `maxDiffPixelRatio: 0.001`, `animations: "disabled"`, `reducedMotion: "reduce"` (khối `prefers-reduced-motion` trong `site/src/styles/base.css` tắt smooth scroll và các
animation lặp).

Trước khi chụp, spec cuộn toàn bộ trang để mọi IntersectionObserver đều đã kích hoạt, rồi kiểm tra độ sẵn sàng qua các hook test cố định, không bao giờ qua class:
có ít nhất một phần tử `[data-reveal-state]` và không phần tử nào có `data-reveal-state="pending"` (`site/src/lib/use-reveal.ts`);
mọi dòng của `data-testid="terminal-body"` (`site/src/components/terminal-typewriter.tsx`) đã rời `data-line-state="pending"` (mọi dòng tồn tại từ lần paint đầu tiên, bị ẩn,
nên hộp không bao giờ lớn thêm) và con trỏ `data-testid="terminal-cursor"` (`site/src/sections/start-section.tsx`) nằm bên trong nó;
iframe `data-testid="example-preview"` (`site/src/components/preview-frame.tsx`) đã render `#root`. Không CSS nào đọc các hook này; hãy giữ chúng khi bạn đổi markup của site.

Layout guard: `e2e-site/layout.spec.ts` (cùng config, không có ảnh chụp) khẳng định, với `/`, `/docs/architecture|guide|testing|deploy`,
`/vi/docs/architecture|guide` và `/examples/v4` ở 1280×800, 768×1024 và 375×812, rằng `document.documentElement.scrollWidth <= clientWidth`; ở ≤860 px,
rằng nút `Menu` của topbar (`aria-expanded`, `aria-controls`) mở điều hướng `Pages` (các liên kết Docs và Examples), `Escape` đóng nó và một cú nhấp vào liên kết cũng đóng nó;
và trên mobile, rằng nút chuyển theme nằm trong viewport. `e2e-site/locale.spec.ts` (cùng config, không có ảnh chụp) kiểm tra tài liệu tiếng Việt:
`/vi/docs` mở `/vi/docs/introduction`, `/vi/docs/guide` đặt `<html lang="vi">` và hiển thị `vi.title` của nó, nút chuyển ở breadcrumb đi tới `/docs/guide` và quay lại,
các liên kết trong twin vẫn nằm dưới `/vi/docs/`, và mọi anchor trong trang đều có heading của nó. `yarn test:visual` chạy cả ba spec,
nên job so sánh cũng thất bại khi có một hồi quy về layout hoặc locale. Đặt `SITE_PORT` để chạy preview server trên một cổng khác 4173.

Font: `e2e-site/pin-fonts.ts` (dùng chung bởi cả hai spec) chặn mọi request tới `fonts.googleapis.com`/`fonts.gstatic.com` và trả lời bằng các bản sao đã ghim trong
`e2e-site/fixtures/fonts/` (`site.css`, `harness.css` và các file `.woff2`); mỗi test khẳng định không có request font nào chạm tới mạng.
Khi bạn đổi liên kết Google Fonts trong `site/index.html` hoặc `examples/harness/index.html`, hãy làm mới các fixture và cập nhật `FONT_CSS` trong `e2e-site/pin-fonts.ts`.
Để làm mới: tải từng URL stylesheet được liệt kê trong `FONT_CSS` với một `User-Agent` Chrome hiện tại (để Google trả về các rule `@font-face` `woff2`) vào
`e2e-site/fixtures/fonts/<css file>`, giữ nguyên các tham chiếu `url(https://fonts.gstatic.com/…)`; sau đó tải từng `https://fonts.gstatic.com/<path>` được tham chiếu vào cùng thư
mục với tên `<path>` trong đó mỗi `/` được thay bằng `_` (ví dụ `s/geist/v5/x.woff2` → `s_geist_v5_x.woff2`), là tên mà spec tìm kiếm,
và xóa các file fixture không còn được tham chiếu.

Baseline chỉ có cho Linux (`*-chromium-linux.png`; `.gitignore` loại trừ các file `-darwin`/`-win32`) vì cách render font khác nhau giữa macOS và Linux.
Chạy cục bộ trên macOS chỉ để gỡ lỗi (tạo các baseline darwin tạm bằng `yarn test:visual:update`). Để cập nhật các baseline sau một thay đổi UI có chủ đích:
chạy phần so sánh trước (một PR không phải draft), tải artifact `site-visual-report` để có danh sách chính xác các ảnh đã đổi, để danh sách đó được duyệt,
và chỉ khi đó mới thêm nhãn `visual-update` (`gh pr edit <N> --add-label visual-update`). Tải artifact `site-visual-baselines` của lần chạy `Site visual update` vào một thư mục
tạm, kiểm tra `headSha` của lần chạy so với `HEAD`, chép các file vào `e2e-site/__screenshots__/`, commit chúng và gỡ nhãn.

### 8. Kiểm tra các component mẫu

```bash
yarn build:all                                # the apps link the library's dist/*.d.ts
yarn workspace harness-example typecheck     # src/ui/*.tsx + tests/ui-types.tsx
yarn lint                                     # registry rules: banned tags, no className/style, Grid needs columns
```

Sáu component mẫu (`examples/harness/src/ui/`) là mã ví dụ, không phải một API, và không có test runner.
Các bước kiểm tra của chúng diễn ra lúc biên dịch: `examples/harness/tests/ui-types.tsx` chứa các dòng `@ts-expect-error` mà mỗi dòng phải được tiêu thụ bởi một lỗi kiểu thật (sai
token, sai breakpoint, sai prop `as`). CI chạy bước kiểm tra kiểu trong cùng một bước `yarn workspaces foreach … run typecheck`, `yarn lint` trong bước riêng của nó,
và render ứng dụng qua `yarn workspace site build` (build `harness`). Các component được mô tả trong [`components.md`](./components.md).

Các ứng dụng plain có các bước kiểm tra riêng: `yarn check:plain-ui` (cấu trúc thư mục, các import, `style.ts` giống hệt nhau ở `plain-react` và `plain-nuxt`;
`types.ts` và các story không được so sánh, và mỗi thư mục cần một file story (`<Name>.stories.tsx` / `.stories.ts`); script cũng so sánh `theme.ts`,
`theme/theme.json` và `theme/theme.tokens.ts` được sinh ra giữa hai ứng dụng; test trong `src/__integration__/check-plain-ui.test.ts` và `check-plain-ui.repo.test.ts`),
`yarn workspace plain-nuxt-example typecheck` (kèm test kiểu `tests/nuxt/ui-props.vue`) và bản build của `plain-nuxt`.
Lint cũng cần `yarn workspace plain-nuxt-example prepare:nuxt`.

### 9. Docs (embed, snippet, export)

```bash
yarn build:all              # snippets and exports read dist/*.d.ts
yarn check:docs-embed       # a block with <!-- embed: path#region --> must equal that region of the real example file
yarn check:docs-i18n        # every rendered doc has a documents/vi/ twin: current source hash, same headings, markers and code blocks
yarn check:doc-snippets     # every ts/tsx block in README.md and documents/ (not plans, brainstorm, migration) must type-check
yarn check:doc-exports      # every export of every subpath needs a heading in documents/reference/<subpath>.md, a signature block matching dist/*.d.ts and a non-empty TSDoc (fix with yarn docs:signatures)
```

Vì sao: các hướng dẫn không bao giờ chứa mã chép tay (nên chúng không thể lệch khỏi ví dụ đang chạy), và một ví dụ trong tài liệu không thể lặng lẽ hỏng khi API đổi.
Cách bỏ qua: một dòng `<!-- snippet: no-check <reason> -->` ngay trước khối; lý do là bắt buộc và các khối được bỏ qua chiếm tối đa 10% tổng số khối.
Đánh dấu một vùng trong file nguồn bằng `#region docs:<name>` / `#endregion docs:<name>` theo cú pháp chú thích của ngôn ngữ đó;
`site/src/lib/example-files.ts` loại các dòng này khỏi trang ví dụ. Test: `src/__integration__/doc-scripts.test.ts`.

Các twin tiếng Việt (`documents/vi/`) đi qua cùng các bước kiểm tra embed và snippet (trừ các twin của hướng dẫn nâng cấp).
`check:docs-i18n` so sánh mỗi twin với file tiếng Anh của nó; quy trình làm việc và bảng thuật ngữ nằm trong `documents/README.md`.
Test: `src/__integration__/docs-i18n.test.ts` (cũng gồm các quy tắc twin của `site/scripts/check-doc-links.mjs`).

### 10. Các Storybook, gate đối sánh, copy-out smoke

```bash
yarn build:all                                          # the workspace links dist/ and `generate` runs the built CLI
yarn playwright install chromium                        # once per machine
yarn workspace plain-react-example test                 # both Vitest browser projects: storybook + parity
yarn workspace plain-react-example test:parity          # only the parity gate
node examples/plain-react/scripts/copy-out-smoke.mjs    # every src/ui folder type-checks with the packed tarball + peers only
```

Hai ứng dụng ví dụ có Storybook (`examples/plain-react`, `examples/plain-nuxt`); mỗi cái là một Storybook riêng, không ghép (composition).
Chỉ có story của component: mỗi `.storybook/main.ts` chỉ nạp `src/ui/**` (`app/ui/**` trong `plain-nuxt`), nên các section của landing page, `App` và `ThemeSwitch` không có story.
Chúng chung các quy tắc story: `tags: ["autodocs"]` trong preview (một trang docs cho mỗi file story), `args` trên mọi story,
một story cho mỗi giá trị variant (cùng một story tổng quan mọi variant), một hàm `play` trên mọi story có tương tác (viết bằng `storybook/test`),
và không có tên class Tailwind thô trong story: nó render qua các component của chính ứng dụng, nên một story không thêm utility nào vào CSS của ứng dụng.
Điểm vào CSS của mỗi ứng dụng còn mang `@source not "<path>/**/*.stories.*"`, và chú thích trong story tránh các từ utility như `blur` và `filter`,
nên CSS sinh ra giữ nguyên dù có hay không có story. Trong `examples/plain-react`, mỗi story `src/ui/<name>/<Name>.stories.tsx` chạy như một test trong project Vitest `storybook`
(`@storybook/addon-vitest`, Chromium), và `yarn check:plain-ui` yêu cầu một file story cho mỗi thư mục component.
`examples/plain-nuxt` dùng `@storybook/vue3-vite` (không có module Nuxt) với các bản port `<Name>.stories.ts` viết tay có cùng title, tên story và args.
Mỗi ứng dụng: `yarn workspace <app>-example storybook` (dev), `storybook:build` và `test:stories` (các story như test trình duyệt của Vitest);
CI chạy các story của cả hai ứng dụng (job `plain-react` và `plain-nuxt`); chỉ `plain-react` có thêm gate parity.
Project `parity` (`tests/parity/*.parity.test.{ts,tsx}`) render từng component trong sáu component dùng chung và twin harness của nó từ `harness-example/ui` với cùng các prop,
và so sánh các token class đã sắp xếp của phần tử gốc và của mọi phần tử con có class. Mỗi file trước hết khẳng định các bảng plain và các bảng harness có cùng các variant,
key tùy chọn và mục compound, rồi sinh các trường hợp từ cả hai (mỗi tùy chọn variant, mỗi mục compound) cộng với mọi thuộc tính spacing,
nên một variant mới ở bên nào cũng không cần sửa test và một tùy chọn chỉ có ở một bên sẽ thất bại. Một thay đổi một class ở bên nào cũng làm nó đỏ.
`theme.parity.test.ts` giữ bản sao theme plain bằng với các token của harness. Mọi script chạy `yarn generate` trước (plain-nuxt: `generate:theme`),
nên CSS theme tồn tại trước khi Vitest hoặc Storybook khởi động. Copy-out smoke đóng gói thư viện, chép `src/theme.ts`, `src/theme/theme.tokens.ts`,
`src/theme/theme.json` và mọi thư mục của `src/ui/` vào một dự án tạm chỉ có tarball và các peer ở đúng phiên bản mà repo resolve (không có script dependency, registry công khai,
môi trường theo allowlist), và chạy `tsc --noEmit`.

---

## Viết test mới

1. Đặt `${name}.test.ts` (hoặc `${name}.test-d.ts` cho một test kiểu) cạnh file được kiểm thử.
2. Kiểm thử **hành vi** (biên, bất biến, lỗi), không phải việc nối dây, và đừng chép lại phần hiện thực.
3. Nếu bạn cần CSS đã biên dịch thật → dùng `compileFixtureCss`, đừng gọi `compile()` trực tiếp.
4. Chỉ thêm e2e khi hành vi phụ thuộc vào engine trình duyệt.

<!-- snippet: no-check imports repo-internal src/ modules -->

```typescript
import { describe, expect, it } from "vitest";
import { toKebabCase } from "./helpers";

describe("toKebabCase", () => {
  it("adds a dash at the letter→digit boundary", () => {
    expect(toKebabCase("blue500")).toBe("blue-500");
  });
});
```
