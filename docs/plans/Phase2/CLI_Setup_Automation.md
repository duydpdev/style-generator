# Plan: CLI & Setup Automation

> **Trạng thái: Draft** _(2026-03-04)_  
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

Thêm CLI binary `style-gen` vào package, cung cấp 3 commands:

```bash
npx style-gen init          # Scaffold project files
npx style-gen safelist      # Generate safelist.txt
npx style-gen safelist -w   # Watch mode: regenerate on theme change
```

### Kiến trúc

```
src/
├── cli/
│   ├── index.ts            # CLI entry point (bin)
│   ├── commands/
│   │   ├── init.ts         # init command handler
│   │   └── safelist.ts     # safelist command handler
│   └── templates/
│       ├── theme.json      # Template theme config
│       ├── plugin-v4.ts.tpl    # Template cho Tailwind v4 plugin file
│       └── css-v4.css.tpl      # Template cho CSS import file
```

---

## Chi tiết từng Command

### Command 1: `style-gen init`

**Mục đích**: Tự động tạo các file cần thiết để bắt đầu sử dụng lib.

**Flow**:

```
$ npx style-gen init

? Tailwind version? (v3 / v4)  → v4
? Theme file location? (styles/theme.json)  → Enter (default)
? Plugin file location? (plugins/theme-plugin.ts)  → Enter (default)
? Include dark mode template? (Y/n)  → Y

✅ Created styles/theme.json
✅ Created plugins/theme-plugin.ts
✅ Updated your CSS file with @plugin and @source directives
📝 Next steps:
   1. Edit styles/theme.json with your design tokens
   2. Run: npx style-gen safelist
   3. Start your dev server
```

**Files được tạo**:

#### `styles/theme.json` (template)

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

Nếu user chọn dark mode:

```json
{
  "...": "...(base config ở trên)",
  "themes": {
    "dark": {
      "colors": {
        "base": {
          "background": "#111827",
          "surface": "#1F2937"
        },
        "text": {
          "main": "#F9FAFB",
          "muted": "#9CA3AF"
        }
      },
      "shadows": {
        "sm": "0px 1px 2px rgba(0, 0, 0, 0.3)",
        "md": "0px 4px 6px rgba(0, 0, 0, 0.4)"
      }
    }
  }
}
```

#### `plugins/theme-plugin.ts` (v4 template)

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

**Điểm quan trọng**: Plugin file KHÔNG còn chứa logic `fs.writeFileSync` / `process.argv` detection. Trách nhiệm sinh `safelist.txt` chuyển hoàn toàn cho CLI command.

---

### Command 2: `style-gen safelist`

**Mục đích**: Sinh file `safelist.txt` từ theme config + options.

**Flow**:

```
$ npx style-gen safelist

Reading theme from styles/theme.json...
Generated 847 safelist classes
✅ Written to styles/safelist.txt
```

**Options**:

```
npx style-gen safelist                          # Default paths
npx style-gen safelist --theme ./theme.json     # Custom theme path
npx style-gen safelist --out ./safelist.txt     # Custom output path
npx style-gen safelist --plugin ./plugin.ts    # Read options from plugin file
npx style-gen safelist -w                       # Watch mode
npx style-gen safelist -w --debounce 300       # Watch with custom debounce
```

**Watch mode**:

```
$ npx style-gen safelist -w

Watching styles/theme.json for changes...
[14:32:01] Theme changed → regenerated 847 classes → styles/safelist.txt
[14:35:22] Theme changed → regenerated 852 classes → styles/safelist.txt
```

Watch mode dùng `fs.watch` (hoặc `chokidar` nếu cần cross-platform reliability) để theo dõi theme file. Khi file thay đổi, tự động regenerate safelist.

#### Vấn đề cốt lõi: CLI lấy `options` (breakpoints, modules, screens...) ở đâu?

> **Đây là design gap quan trọng nhất của plan, cần giải quyết trước khi implement.**

Plugin file chứa options (breakpoints, screens, module configs...). Khi tách safelist generation ra CLI, CLI cần biết đúng options này để sinh safelist khớp với plugin. Nếu options khác nhau giữa CLI và plugin → safelist sai → class bị purge.

**3 phương án:**

| #   | Phương án                                                           | Ưu điểm                                            | Nhược điểm                                                                                                               |
| --- | ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| A   | CLI dynamic import plugin file (qua `tsx`)                          | Single source of truth — options chỉ ở plugin file | Cần `tsx` runtime để parse TS; plugin file import theme → cần resolve path đúng; fragile nếu plugin file có side effects |
| B   | CLI đọc config riêng (`style-gen.config.ts` hoặc `package.json`)    | Tách biệt rõ ràng, không cần tsx                   | User phải maintain options ở 2 nơi (plugin + CLI config) → dễ lệch                                                       |
| C   | Plugin file export `safelist` trực tiếp, CLI chỉ import và ghi file | Đơn giản nhất, plugin là single source of truth    | Vẫn cần `tsx` để import TS module                                                                                        |

**Quyết định: Phương án C** (CLI import plugin file, lấy `safelist` export)

Lý do:

- Plugin file đã tính sẵn `safelist` (từ `createStyleSystem`). CLI chỉ cần import và ghi ra file.
- Không duplicate logic. Không cần tách options ra config riêng.
- Yêu cầu `tsx` (hoặc `ts-node`) đã có sẵn trong devDependencies.

**Implementation cho phương án C:**

```typescript
// src/cli/commands/safelist.ts
import { pathToFileURL } from "node:url";

async function generateSafelistFile(pluginPath: string, outPath: string) {
  // Dynamic import plugin file (chạy qua tsx runtime)
  const absolutePlugin = path.resolve(process.cwd(), pluginPath);
  const pluginModule = await import(pathToFileURL(absolutePlugin).href);

  // Plugin file phải export { safelist }
  const { safelist } = pluginModule;
  if (!Array.isArray(safelist)) {
    throw new Error(
      `Plugin file "${pluginPath}" must export "safelist" (string[]).\n` +
        `Make sure your plugin file has: export { safelist }`,
    );
  }

  fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
}
```

**Plugin file template cần update** — đảm bảo `safelist` được export:

```typescript
// plugins/theme-plugin.ts
import { createStyleSystem, Breakpoint } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";

const { plugin, safelist } = createStyleSystem(theme, {
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

export default plugin;
export { safelist }; // ← CLI sẽ import field này
```

**CLI chạy bằng `tsx`:**

```bash
# CLI gọi nội bộ:
# node --import tsx ./dist/cli/index.js safelist --plugin ./plugins/theme-plugin.ts
```

Hoặc đơn giản hơn — CLI binary entry point dùng `tsx` register:

```typescript
#!/usr/bin/env node
// src/cli/index.ts
import "tsx/esm/api"; // Register tsx loader cho dynamic imports
```

> **Lưu ý**: `tsx` đã là devDependency hiện tại. User cũng cần `tsx` để chạy `@plugin` directive của Tailwind v4. Không thêm dependency mới.

---

### Command 3: `style-gen info` (nice-to-have)

```
$ npx style-gen info

Theme: styles/theme.json
  Colors:  6 (4 base + 2 text)
  Typography: 2 variants
  Shadows: 2
  Border Radius: 3
  Themes: 1 (dark)

Safelist: 847 classes
  Layout: 312 (with md:, lg: responsive)
  Colors: 108
  Typography: 4
  Rounded: 90
  ...
```

---

## Implementation Plan

### Phase 1: Core CLI (MVP)

**Files mới**:

| File                           | Mô tả                                                  |
| ------------------------------ | ------------------------------------------------------ |
| `src/cli/index.ts`             | Entry point, parse args, route to commands             |
| `src/cli/commands/init.ts`     | `init` command — interactive prompts + file generation |
| `src/cli/commands/safelist.ts` | `safelist` command — read theme, generate, write file  |
| `src/cli/templates/`           | Template files cho init command                        |

**Dependencies mới**:

| Package                   | Mục đích                                                                                         | Dev/Prod |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------- |
| Không cần thêm dependency | Dùng `node:util.parseArgs` (Node 18.3+) cho arg parsing, `node:readline` cho interactive prompts | —        |

> **Lý do không dùng `commander`/`yargs`**: Lib này nhẹ, chỉ có 2-3 commands đơn giản. `node:util.parseArgs` (built-in Node.js 18.3+) đủ dùng. Giảm dependency footprint.

#### Interactive prompts cho `init` command

> **Lưu ý quan trọng**: `node:util.parseArgs` chỉ parse CLI arguments (flags, options), **không** làm interactive prompts (hỏi user chọn Tailwind version, theme path...).

**Cho interactive prompts, có 2 phương án:**

| #   | Phương án                                         | Ưu điểm                                            | Nhược điểm                                                                              |
| --- | ------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| A   | Dùng `node:readline/promises` (built-in Node 18+) | Zero dependency                                    | API thô, phải tự viết logic yes/no, select; không có UI đẹp (không có arrow key select) |
| B   | Dùng lightweight lib (`@clack/prompts` ~7KB)      | UI đẹp, API clean, spinner/select/confirm built-in | Thêm 1 dependency                                                                       |

**Quyết định: Phương án A cho MVP, cân nhắc B nếu cần UX tốt hơn**

MVP chỉ cần 3-4 câu hỏi đơn giản (yes/no + text input). `node:readline/promises` đủ dùng:

```typescript
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const rl = createInterface({ input: stdin, output: stdout });

const tailwindVersion =
  (await rl.question("Tailwind version? (v3/v4) [v4]: ")) || "v4";
const themePath =
  (await rl.question("Theme file location? [styles/theme.json]: ")) ||
  "styles/theme.json";
const includeDarkMode =
  (await rl.question("Include dark mode template? (Y/n): ")).toLowerCase() !==
  "n";

rl.close();
```

Nếu sau này cần select menu, spinner, v.v. → upgrade lên `@clack/prompts`.

**Fallback khi chạy trong non-interactive mode** (CI, piped input):

```bash
# Non-interactive: dùng flags thay vì prompts
npx style-gen init --tw v4 --theme styles/theme.json --dark
```

CLI detect `process.stdin.isTTY === false` → skip prompts, yêu cầu flags.

**Thay đổi `package.json`**:

```json
{
  "bin": {
    "style-gen": "./dist/cli/index.js"
  }
}
```

#### Build config cho CLI entry point

> **Lưu ý**: Template files (`.json`, `.tpl`) trong `src/cli/templates/` không phải TypeScript — cần xử lý đặc biệt trong build.

**Vấn đề**: Vite build hiện tại chỉ có 1 entry point (lib). CLI cần entry point riêng, và template files cần được bundle/copy đúng cách.

**Giải pháp**: Cấu hình Vite build thêm CLI entry:

```typescript
// vite.config.ts — thêm build cho CLI
export default defineConfig({
  build: {
    lib: {
      entry: {
        index: "src/index.ts", // Lib entry (giữ nguyên)
        "cli/index": "src/cli/index.ts", // CLI entry (mới)
      },
    },
    rollupOptions: {
      external: [
        "node:fs",
        "node:path",
        "node:url",
        "node:readline/promises",
        "node:util",
      ],
    },
  },
});
```

**Xử lý template files** — 2 cách:

| #   | Cách                                            | Mô tả                                                                                             |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| A   | Inline templates thành string literals trong TS | Không cần copy files, templates là code. Nhược: khó đọc/edit template dài.                        |
| B   | Dùng Vite raw import (`?raw` suffix)            | `import themeTemplate from "./templates/theme.json?raw"`. Vite inline nội dung file thành string. |

**Quyết định: Cách B** — dùng `?raw` import. Templates vẫn là file riêng (dễ edit), nhưng được inline khi build:

```typescript
// src/cli/commands/init.ts
import themeTemplate from "../templates/theme.json?raw";
import themeWithDarkTemplate from "../templates/theme-dark.json?raw";
import pluginV4Template from "../templates/plugin-v4.ts.tpl?raw";

function createThemeFile(path: string, includeDarkMode: boolean) {
  const content = includeDarkMode ? themeWithDarkTemplate : themeTemplate;
  fs.writeFileSync(path, content, "utf8");
}
```

Cần thêm type declaration cho `?raw` imports:

```typescript
// src/cli/raw.d.ts
declare module "*.json?raw" {
  const content: string;
  export default content;
}
declare module "*.tpl?raw" {
  const content: string;
  export default content;
}
```

### Phase 2: Watch mode

- Thêm `--watch` / `-w` flag cho `safelist` command
- Dùng `fs.watch` (Node.js built-in) hoặc `fs.watchFile` cho reliability
- Debounce 200ms default (configurable via `--debounce`)

### Phase 3: Config file (optional)

Hỗ trợ file config `style-gen.config.ts` hoặc field trong `package.json`:

```json
{
  "style-gen": {
    "theme": "styles/theme.json",
    "output": "styles/safelist.txt",
    "tailwindVersion": "v4",
    "pluginPath": "plugins/theme-plugin.ts"
  }
}
```

Giảm số arguments cần truyền qua CLI.

---

## Tác động đến codebase hiện tại

### Breaking changes: **Không**

CLI là additive — không thay đổi API hiện có. User không bắt buộc dùng CLI.

### File changes

| File                            | Hành động                                             |
| ------------------------------- | ----------------------------------------------------- |
| `package.json`                  | Thêm `bin` field, thêm build script cho CLI           |
| `vite.config.ts` / build config | Thêm CLI entry point                                  |
| `src/cli/`                      | **Mới** — toàn bộ CLI code                            |
| `README.md`                     | Thêm section "Quick Start with CLI"                   |
| `docs/guide.md`                 | Thêm section CLI usage                                |
| `examples/v4-plugin.ts`         | Cập nhật — bỏ dual-purpose pattern, chỉ export plugin |

### Cập nhật docs

README "Quick Start" section mới:

````markdown
## Quick Start

### 1. Init project

```bash
npx style-gen init
```
````

### 2. Edit theme

Edit `styles/theme.json` with your design tokens.

### 3. Generate safelist

```bash
npx style-gen safelist
```

### 4. Start developing

Your CSS file is ready. Start your dev server.

```

---

## Verification

- [ ] `npx style-gen init` tạo đúng files với nội dung hợp lệ
- [ ] `npx style-gen safelist` sinh file giống output hiện tại từ `examples/v4-plugin.ts`
- [ ] `npx style-gen safelist -w` tự regenerate khi theme file thay đổi
- [ ] `npx style-gen --help` hiển thị usage rõ ràng
- [ ] Plugin file mới (không có dual-purpose) vẫn hoạt động với `@plugin` directive
- [ ] `yarn build` build CLI entry point thành công
- [ ] `yarn lint` pass

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `node:util.parseArgs` không có ở Node < 18.3 | Peer dependency `node >= 18.3` hoặc fallback parsing |
| Watch mode không ổn định trên một số OS | Fallback `fs.watchFile` (polling) khi `fs.watch` fail |
| CLI binary path conflict | Dùng tên `style-gen` (unique enough), check npm registry trước khi publish |
| Template files tăng package size | Dùng `?raw` import → inline vào JS bundle, ~2KB total |
| Dynamic import plugin file cần `tsx` runtime | `tsx` đã là devDependency; user cần nó cho `@plugin` directive; ghi rõ trong docs |
| Non-interactive environment (CI) không có TTY | Detect `process.stdin.isTTY`, fallback sang flags-only mode |

---

## Timeline ước tính

| Phase | Effort |
|-------|--------|
| Phase 1 (init + safelist) | ~4-6h |
| Phase 2 (watch mode) | ~2h |
| Phase 3 (config file) | ~2h |
| Docs update | ~1h |
| **Tổng** | **~9-11h** |
```
