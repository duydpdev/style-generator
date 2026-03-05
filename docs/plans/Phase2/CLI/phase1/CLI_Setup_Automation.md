# Plan: CLI & Setup Automation

> **Trạng thái: Approved** _(2026-03-05, updated)_
> **Ưu tiên: Cao** — giảm barrier-to-entry cho người dùng mới
> **Phụ thuộc: Không** (có thể implement độc lập)

---

## Bối cảnh & Vấn đề

### Setup hiện tại cho Tailwind v4 (4 bước thủ công)

1. Tạo `theme.json` — phải tự viết cấu trúc đúng, không có template
2. Tạo `theme-plugin.ts` — phải copy/paste boilerplate phức tạp (import fs, path, process.argv detection...)
3. Chạy `npx tsx src/plugins/theme-plugin.ts` — sinh `safelist.txt`
4. Import 3 dòng vào CSS (`@import`, `@plugin`, `@source`)

### Vấn đề cụ thể

| #   | Vấn đề                                                                            | Impact                                                                   |
| --- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 1   | User phải tự viết Node.js script với `fs.writeFileSync`, `process.argv` detection | Người không quen Node.js sẽ bối rối                                      |
| 2   | Không có template cho `theme.json` — user phải đọc docs để biết cấu trúc bắt buộc | Dễ viết sai, không có feedback                                           |
| 3   | `safelist.txt` phải chạy tay mỗi khi theme thay đổi                               | Dễ quên → class bị purge ở production                                    |
| 4   | Plugin file "dual purpose" (export + script) là pattern fragile                   | `process.argv[1] === import.meta.filename` có thể vỡ tùy runtime/bundler |

---

## Giải pháp: CLI tool `style-gen`

### Tổng quan

Thêm CLI binary `style-gen` vào package, cung cấp 2 commands (MVP):

```bash
npx style-gen init          # Scaffold project files
npx style-gen safelist      # Generate safelist.txt
```

### Kiến trúc

```
src/cli/
├── index.ts              # CLI entry point (bin) — parseArgs → route command
├── commands/
│   ├── init.ts           # init: prompts + scaffold files
│   └── safelist.ts       # safelist: read config → generateSafelist() → write
├── config.ts             # Resolve: flags → config file → package.json → defaults
├── templates.ts          # Inline template strings (theme, plugin, CSS)
└── logger.ts             # Colored console output (ANSI codes, no dependency)
```

---

## Quyết định thiết kế (đã review & approved)

### QĐ1: Safelist strategy — CLI tự gọi `generateSafelist()`

> **Quyết định: CLI import trực tiếp `generateSafelist()` từ lib, KHÔNG dynamic import plugin file.**

| So sánh                | Phương án C cũ (import plugin)                   | ✅ Đề xuất mới                        |
| ---------------------- | ------------------------------------------------ | ------------------------------------- |
| Cần `tsx` runtime      | ✅ Bắt buộc                                      | ❌ Không cần                          |
| Cross-platform         | ⚠️ Fragile (`pathToFileURL` issues trên Windows) | ✅ Ổn định                            |
| Single source of truth | ✅ Qua plugin                                    | ✅ Qua `generateSafelist()` trong lib |
| Độ phức tạp implement  | Cao                                              | **Thấp**                              |

Lý do: Logic `generateSafelist()` đã nằm trong lib. CLI đọc `theme.json` (pure JSON) + config, gọi function trực tiếp — đơn giản và zero runtime dependency.

### QĐ2: Config source — JSON config file

> **Quyết định: Dùng `style-gen.config.json`. TS config defer sang tương lai.**

Fallback chain: **CLI flags → `style-gen.config.json` → `package.json["style-gen"]` → defaults**

JSON đủ cho options đơn giản (breakpoints, modules, screens). Không cần tsx/ts-node để parse. User dự án Tailwind quen JSON config.

### QĐ3: Build tool — `tsdown` tách riêng cho CLI

> **Quyết định: Dùng `tsdown` build CLI riêng, giữ Vite chỉ cho lib.**

Lý do: Vite strip shebang, `?raw` import coupling, `rollupTypes` conflict multi-entry. `tsdown` xử lý Node.js binary tốt hơn.

### QĐ4: Templates — Inline template literals

> **Quyết định: Inline templates thành string literals trong TypeScript.**

Templates chỉ ~20-50 dòng. Không cần `?raw` (Vite-specific), không cần type declarations. Nếu template lớn hơn thì refactor sau.

### QĐ5: Prompts — `@clack/prompts`

> **Quyết định: Dùng `@clack/prompts` (~7KB gzipped) thay vì `node:readline`.**

Lý do: `init` cần select menu (chọn v3/v4), confirm (Y/n), text input. `readline` không có select. Code ngắn hơn ~60%. UX professional — quan trọng cho first impression.

### QĐ6: Watch mode — Defer sang Phase 2

> **Quyết định: Phase 1 KHÔNG có watch mode. Phase 2 implement với `chokidar`.**

User chạy `npx style-gen safelist` mỗi khi thay đổi theme — chấp nhận được cho MVP. `fs.watch` built-in có nhiều bugs known (duplicate events macOS, NFS issues).

### QĐ7: Arg parsing — `node:util.parseArgs`

> **Quyết định: Giữ nguyên `parseArgs`. Tự viết `--help` handler.**

Đủ cho 2-3 commands đơn giản. Không cần thêm dependency.

### QĐ8: `style-gen info` — Defer

> **Quyết định: Defer hoàn toàn. Tập trung MVP vào `init` + `safelist`.**

---

## Chi tiết từng Command

### Command 1: `style-gen init`

**Mục đích**: Tự động tạo các file cần thiết để bắt đầu sử dụng lib.

**Flow**:

```
$ npx style-gen init

◆ Tailwind version?
│ ● v4 (recommended)
│ ○ v3
└

◆ Theme file location?
│ styles/theme.json
└

◆ Plugin file location?
│ plugins/theme-plugin.ts
└

◆ Include dark mode template?
│ ● Yes / ○ No
└

✅ Created styles/theme.json
✅ Created plugins/theme-plugin.ts
✅ Updated your CSS file with @plugin and @source directives
📝 Next steps:
   1. Edit styles/theme.json with your design tokens
   2. Run: npx style-gen safelist
   3. Start your dev server
```

**Non-interactive mode** (CI, piped input):

```bash
npx style-gen init --tw v4 --theme styles/theme.json --dark
```

CLI detect `process.stdin.isTTY === false` → skip prompts, yêu cầu flags.

**Files được tạo**:

#### `styles/theme.json` (inline template)

```json
{
  "colors": {
    "base": {
      "primary": "#3B82F6",
      "secondary": "#6366F1",
      "background": "#FFFFFF",
      "surface": "#F9FAFB"
    },
    "text": {
      "main": "#111827",
      "muted": "#6B7280"
    }
  },
  "typography": {
    "heading1": {
      "fontSize": "32px",
      "lineHeight": "120%",
      "fontWeight": 700,
      "letterSpacing": "-0.02em"
    },
    "body": {
      "fontSize": "16px",
      "lineHeight": "150%",
      "fontWeight": 400,
      "letterSpacing": "0px"
    }
  },
  "shadows": {
    "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)",
    "md": "0px 4px 6px rgba(0, 0, 0, 0.1)"
  },
  "borderRadius": {
    "sm": "4px",
    "md": "8px",
    "lg": "12px"
  }
}
```

Nếu user chọn dark mode, thêm `themes.dark` vào template.

#### `plugins/theme-plugin.ts` (inline template)

```typescript
import { createStyleSystem, Breakpoint } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

const { plugin, safelist } = createStyleSystem(theme, {
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

export default plugin;

// Safelist is managed by CLI: npx style-gen safelist
export { safelist };
```

**Điểm quan trọng**: Plugin file KHÔNG còn chứa logic `fs.writeFileSync` / `process.argv` detection. Trách nhiệm sinh `safelist.txt` chuyển hoàn toàn cho CLI.

---

### Command 2: `style-gen safelist`

**Mục đích**: Sinh file `safelist.txt` từ theme config + options.

**Core logic** — CLI tự gọi `generateSafelist()`:

```typescript
// src/cli/commands/safelist.ts
import { generateSafelist } from "../../factories/generateSafelist";

async function safelistCommand(args: SafelistArgs) {
  // 1. Đọc theme.json (pure JSON, không cần tsx)
  const theme = JSON.parse(fs.readFileSync(args.themePath, "utf8"));

  // 2. Đọc options từ config file hoặc defaults
  const options = resolveConfig(args);

  // 3. Gọi generateSafelist từ lib (single source of truth)
  const safelist = generateSafelist(theme, options);

  // 4. Ghi file
  fs.writeFileSync(args.outPath, safelist.join("\n"), "utf8");
  console.log(`✅ Safelist written (${safelist.length} classes)`);
}
```

**Options**:

```
npx style-gen safelist                          # Default paths (từ config)
npx style-gen safelist --theme ./theme.json     # Custom theme path
npx style-gen safelist --out ./safelist.txt     # Custom output path
```

---

### Config file: `style-gen.config.json`

```json
{
  "theme": "styles/theme.json",
  "output": "styles/safelist.txt",
  "plugin": "plugins/theme-plugin.ts",
  "breakpoints": ["md", "lg"],
  "responsiveModules": ["layout", "rounded"],
  "screens": { "md": "800px" }
}
```

Config resolution chain: **CLI flags → `style-gen.config.json` → `package.json["style-gen"]` → defaults**

---

## Implementation Plan

### Phase 1: Core CLI (MVP)

**Files mới**:

| File                           | Mô tả                                                |
| ------------------------------ | ---------------------------------------------------- |
| `src/cli/index.ts`             | Entry point, parseArgs, route to commands            |
| `src/cli/commands/init.ts`     | `init` command — prompts (@clack) + scaffold files   |
| `src/cli/commands/safelist.ts` | `safelist` command — read config, generateSafelist() |
| `src/cli/config.ts`            | Config resolution (flags → file → package.json)      |
| `src/cli/templates.ts`         | Inline template strings                              |
| `src/cli/logger.ts`            | Colored console output (ANSI codes)                  |

**Dependencies thay đổi**:

| Package          | Loại          | Mục đích                     |
| ---------------- | ------------- | ---------------------------- |
| `tsdown`         | devDependency | Build CLI binary             |
| `@clack/prompts` | dependency    | Interactive prompts cho init |

**Thay đổi `package.json`**:

```json
{
  "bin": {
    "style-gen": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc && vite build",
    "build:cli": "tsdown src/cli/index.ts --format esm --out-dir dist/cli --banner.js '#!/usr/bin/env node'",
    "build:all": "yarn build && yarn build:cli"
  }
}
```

### Phase 2: Watch mode (future)

- Thêm `--watch` / `-w` flag cho `safelist` command
- Dùng `chokidar` cho cross-platform reliability
- Debounce 200ms default

### Phase 3: Config file mở rộng (future)

- Hỗ trợ `style-gen.config.ts` nếu cần logic phức tạp
- `style-gen info` command

---

## Tác động đến codebase hiện tại

### Breaking changes: **Không**

CLI là additive — không thay đổi API hiện có. User không bắt buộc dùng CLI.

### File changes

| File                    | Hành động                                             |
| ----------------------- | ----------------------------------------------------- |
| `package.json`          | Thêm `bin`, `scripts`, dependencies mới               |
| `src/cli/`              | **Mới** — toàn bộ CLI code                            |
| `README.md`             | Thêm section "Quick Start with CLI"                   |
| `examples/v4-plugin.ts` | Cập nhật — bỏ dual-purpose pattern, chỉ export plugin |

### Cập nhật docs — README "Quick Start" mới

````markdown
## Quick Start

### 1. Init project

```bash
npx style-gen init
```

### 2. Edit theme

Edit `styles/theme.json` with your design tokens.

### 3. Generate safelist

```bash
npx style-gen safelist
```

### 4. Start developing

Your CSS file is ready. Start your dev server.
````

---

## Verification

- [ ] `yarn build:all` build cả lib + CLI thành công
- [ ] `node dist/cli/index.js --help` hiển thị usage
- [ ] `npx style-gen init` tạo đúng files với nội dung hợp lệ
- [ ] `npx style-gen safelist` sinh file giống output hiện tại từ `examples/v4-plugin.ts`
- [ ] Plugin file mới (không có dual-purpose) vẫn hoạt động với `@plugin` directive
- [ ] `yarn lint` pass

---

## Risks & Mitigations

| Risk                                            | Mitigation                                                  |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `node:util.parseArgs` không có ở Node < 18.3    | Peer dependency `node >= 18.3` hoặc fallback parsing        |
| CLI binary shebang bị strip                     | `tsdown --banner.js` đảm bảo shebang, verify trong build    |
| Config file không được tìm thấy                 | Fallback chain rõ ràng, error message hướng dẫn tạo config  |
| `@clack/prompts` thêm dependency vào production | Chỉ ~7KB gzipped, chấp nhận được cho CLI UX                 |
| Non-interactive environment (CI) không có TTY   | Detect `process.stdin.isTTY`, fallback sang flags-only mode |
| Template files thay đổi theo version mới        | Version template theo lib version, backward compatible      |

---

## Timeline ước tính

| Phase                  | Effort    |
| ---------------------- | --------- |
| Setup build (tsdown)   | ~1h       |
| `safelist` command     | ~2h       |
| `init` command         | ~2-3h     |
| Test + polish          | ~1h       |
| **Tổng MVP (Phase 1)** | **~6-7h** |
