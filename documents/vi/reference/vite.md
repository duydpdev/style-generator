<!-- source: documents/reference/vite.md sha256: 1b789d5b763f -->

# Vite và Nuxt (./vite)

Plugin Vite tự động ghi file `theme.css` cho bạn; Nuxt sử dụng nó thông qua `vite.plugins`. Plugin này cần peer dependency tùy chọn `vite` và chạy trong môi trường Node.

Tất cả các công cụ này đều ghi ra cùng một file `theme.css` (kết quả trả về của `generate()`); hãy chọn công cụ phù hợp với bundler của bạn. Trong mọi trường hợp, hãy `@import` file đó ngay cạnh `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` from a theme JSON. Replaces the
manual `generate-theme.mjs` script step in Tailwind v4 setups. The file is
written in `buildStart` (before any module is transformed, so
`@tailwindcss/vite` finds it when it scans for `@source`), the theme is
registered with `addWatchFile`, and the dev server re-emits and sends a
full-reload when it changes. A failure in `buildStart` fails the build
through `this.error`.

Called with no argument it reads `style-gen.config.json` (else
`package.json#style-gen`) from the Vite root — the `theme`, `output` and
every `generate()` option — exactly as `style-gen generate` does.

Emitting is write-if-changed, so the second `buildStart` of a `vite build`
(one per environment) is a no-op.

Path rules (`resolveProjectPath`): `themePath` may be anywhere (absolute, or
`..` out of the root); `outDir` must stay inside the project root.

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
  `fs.realpathSync`. An `outDir` that is itself a symlink living inside the
  root is accepted even if its TARGET resolves outside it — the guard only
  rejects a literal `..`-escaping input path, not a symlink whose target
  escapes after the filesystem resolves it.

<!-- /signature -->

Sinh `theme.css` khi một dev server khởi động và khi một lần build bắt đầu (`buildStart`), và sinh lại mỗi khi file theme thay đổi (một lần sinh lại có debounce; trình duyệt chỉ full-reload khi CSS thực sự thay đổi). Theme được đăng ký với Rollup (`this.addWatchFile`), nhờ đó `vite build --watch` cũng tự động rebuild khi chỉnh sửa theme. File được ghi trước khi Tailwind quét mã; các ví dụ đặt plugin này đứng trước `@tailwindcss/vite`. Một lỗi tại `buildStart` sẽ làm hỏng quá trình build kèm thông báo có phân tầng (`Invalid JSON in …`, `Invalid options:`, `Invalid theme (<path>):`, `Invalid theme/options:`, `Cannot write …`). `themePath` có thể là đường dẫn tuyệt đối hoặc nằm ngoài project root (trường hợp chia sẻ package theme); `outDir` bắt buộc phải nằm bên trong root.

```ts
// vite.config.ts
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./style-gen.options"; // one shared options module, see §7

export default defineConfig({
  plugins: [
    styleGenVite({
      themePath: "src/theme/theme.json",
      outDir: "src/theme", // must match the @import path in your CSS
      options,
    }),
    tailwindcss(),
  ],
});
```

Nuxt chạy trên Vite: hãy đăng ký cùng plugin này trong `nuxt.config.ts` dưới mục `vite.plugins`. Nuxt 4 đặt `root` của Vite thành `app/`, vì vậy một `themePath` tương đối sẽ được giải quyết (resolve) từ đó; hãy truyền các đường dẫn tuyệt đối (`fileURLToPath(new URL("./theme.json", import.meta.url))`). Ví dụ harness (`examples/harness`) lấy theme và module `options` từ [`examples/design-system`](../../../examples/design-system/README.md); [`examples/plain-nuxt`](../../../examples/plain-nuxt/README.md) giữ theme của mình trong `app/theme/theme.json` và không truyền options. Hãy thêm `theme.css` vào `.gitignore` nếu file theme JSON là nguồn chân lý duy nhất (source of truth) của bạn.

**Lưu ý về dev-server.** Trên Vite 5, `buildStart` của một dev server chạy khi gọi `server.listen()` (hoặc trong `middlewareMode`), vì vậy một `createServer()` không bao giờ gọi `listen()` sẽ không ghi ra `theme.css`; từ Vite 6 trở đi plugin thiết lập `perEnvironmentStartEndDuringDev` và `buildStart` cũng chạy cho cả `createServer()` + `ssrLoadModule`. Plugin đọc `style-gen.config.json` **một lần duy nhất** khi Vite nạp config: hãy khởi động lại dev server sau khi chỉnh sửa file này (chỉ có file theme mới được watch theo dõi thay đổi).

**Không có đối số.** `styleGenVite()` (và `styleGenNext()`) đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) từ Vite root (Next: `process.cwd()`): các trường `theme`, `output` (file CSS cần ghi, mặc định là `styles/theme.css`) và mọi tùy chọn `generate()` có trong đó, nhờ đó CLI và bundler dùng chung một nguồn chân lý duy nhất (source of truth). Một config không hợp lệ hoặc sai cú pháp sẽ ném ra lỗi `[style-gen-vite] Invalid config (<file>):` kèm danh sách sự cố — không bao giờ âm thầm fallback về giá trị mặc định. Khi có truyền đối số, file config sẽ không được đọc. Cả hai dạng không truyền đối số đều đọc file một lần duy nhất khi bundler nạp config (hãy khởi động lại `vite`/`next dev` sau khi chỉnh sửa).

## `StyleGenViteOptions`

<!-- signature: StyleGenViteOptions -->

```ts
export declare interface StyleGenViteOptions {
  themePath: string;
  outDir?: string;
  options?: StyleGeneratorOptions;
}
```

Options of the `styleGenVite()` Vite plugin.

<!-- /signature -->

Các tùy chọn của `styleGenVite()`: đường dẫn file theme, thư mục đầu ra và các tùy chọn cho generator.
