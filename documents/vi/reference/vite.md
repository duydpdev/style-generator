<!-- source: documents/reference/vite.md sha256: 14cb652bb2bc -->

# Vite và Nuxt (./vite)

Plugin Vite tự động ghi file `theme.css` cho bạn; Nuxt sử dụng nó thông qua `vite.plugins`. Plugin này cần peer dependency tùy chọn `vite` và chạy trong môi trường Node.

Plugin ghi ra cùng file `theme.css` với `generate()`; hãy `@import` file đó ngay cạnh `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` and `theme.tokens.ts` from a theme JSON.
The files are written in `buildStart` (before any module is transformed, so
`@tailwindcss/vite` finds the CSS when it scans for `@source`), the theme is
registered with `addWatchFile`, and the dev server re-emits and sends a
full-reload when it changes. A failure in `buildStart` fails the build
through `this.error`.

Every option lives in `style-gen.config.json` (else
`package.json#style-gen`) in the plugin's `root` (default: Vite's root): the
`theme`, `output`, `tokensOutput` and every `generate()` option, exactly as
`style-gen generate` reads them. The only plugin option is `root`; a
relative one resolves against Vite's root (Nuxt sets Vite's root to `app/`,
so it passes the project folder).

A change to the config file in the dev server reloads it in place: the
target is resolved again, the files are re-emitted and the page reloads. An
invalid edit is logged and the last valid config stays in force. The server
is never restarted, so this works inside hosts that own it (Nuxt, Storybook).

Emitting is write-if-changed, so the second `buildStart` of a `vite build`
(one per environment) is a no-op.

Path rules (`resolveProjectPath`): the theme may live anywhere (absolute, or
`..` out of the root); the generated files must stay inside `root`.

Monorepo: warns once if a plugin instance from a DIFFERENT Vite config (or
root, when there is no config file) targets the same `theme.css`. Two
`styleGenVite()` calls inside ONE config file are not warned about: that
is indistinguishable from the per-environment instances Vite creates in
builder mode and from a dev-server restart.

`theme.css` is written atomically (`writeFileAtomic`: sibling temp file +
`renameSync`), so `@tailwindcss/vite` never reads a half-written file.

**Limitations:**

- **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
  logical (non-dereferenced) path against the project root; it never calls
  `fs.realpathSync`. An `output` that is itself a symlink living inside the
  root is accepted even if its TARGET resolves outside it — the guard only
  rejects a literal `..`-escaping input path, not a symlink whose target
  escapes after the filesystem resolves it.

<!-- /signature -->

Sinh `theme.css` và `theme.tokens.ts` khi một dev server khởi động và khi một lần build bắt đầu (`buildStart`), và sinh lại mỗi khi file theme hoặc file config thay đổi (một lần sinh lại có debounce; trình duyệt chỉ full-reload khi CSS thực sự thay đổi). Theme được đăng ký với Rollup (`this.addWatchFile`), nhờ đó `vite build --watch` cũng tự động rebuild khi chỉnh sửa theme. Các file được ghi trước khi Tailwind quét mã; các ví dụ đặt plugin này đứng trước `@tailwindcss/vite`. Một lỗi tại `buildStart` sẽ làm hỏng quá trình build kèm thông báo có phân tầng (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `theme` có thể là đường dẫn tuyệt đối hoặc nằm ngoài project root (trường hợp chia sẻ package theme); `output` và `tokensOutput` bắt buộc phải nằm bên trong root.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

export default defineConfig({
  plugins: [styleGenVite(), tailwindcss()],
});
```

```json
{
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "breakpoints": ["md", "lg"]
}
```

`output` phải khớp với đường dẫn `@import` trong CSS của bạn. Hãy commit `theme.tokens.ts` (code của app import `tokens` từ đó) và thêm `theme.css` vào `.gitignore` nếu file theme JSON là nguồn chân lý duy nhất của bạn.

Nuxt chạy trên Vite: hãy đăng ký cùng plugin này trong `nuxt.config.ts` dưới mục `vite.plugins`. Nuxt 4 đặt `root` của Vite thành `app/`, vì vậy hãy truyền thư mục dự án làm `root` (`styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) })`) và để `style-gen.config.json` ở đó. Ví dụ harness (`examples/harness`) lấy theme và `style-gen.config.json` từ [`examples/design-system`](../../../examples/design-system/README.md); [`examples/plain-nuxt`](../../../examples/plain-nuxt/README.md) giữ theme của mình trong `app/theme/theme.json`.

**Lưu ý về dev-server.** Trên Vite 5, `buildStart` của một dev server chạy khi gọi `server.listen()` (hoặc trong `middlewareMode`), vì vậy một `createServer()` không bao giờ gọi `listen()` sẽ không ghi ra `theme.css`; từ Vite 6 trở đi plugin thiết lập `perEnvironmentStartEndDuringDev` và `buildStart` cũng chạy cho cả `createServer()` + `ssrLoadModule`. Plugin cũng theo dõi file config: một lần sửa sẽ nạp lại nó tại chỗ (đích được phân giải lại, các file được sinh lại và trang tải lại) mà không khởi động lại server; một lần sửa không hợp lệ được ghi log và config hợp lệ gần nhất vẫn có hiệu lực.

**Cấu hình.** `styleGenVite()` (và `styleGenNext()`) đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) từ Vite root (Next: `process.cwd()`): các trường `theme`, `output` (file CSS cần ghi, mặc định là `styles/theme.css`), `tokensOutput` và mọi tùy chọn `generate()` có trong đó, nhờ đó CLI và bundler dùng chung một nguồn chân lý duy nhất. Một config không hợp lệ hoặc sai cú pháp sẽ ném ra lỗi `[style-gen-vite] Invalid config (<file>):` kèm danh sách sự cố — không bao giờ âm thầm fallback về giá trị mặc định. Các tùy chọn 7.x `themePath`, `outDir` và `options` đã bị gỡ ở 8.0 và ném lỗi ngay lúc gọi.

## `StyleGenViteOptions`

<!-- signature: StyleGenViteOptions -->

```ts
export declare interface StyleGenViteOptions {
  root?: string;
}
```

Options of the `styleGenVite()` Vite plugin.

<!-- /signature -->

Các tùy chọn của `styleGenVite()`: thư mục chứa `style-gen.config.json`.
