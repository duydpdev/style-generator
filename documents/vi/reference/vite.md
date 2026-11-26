<!-- source: documents/reference/vite.md sha256: ba0dd7332b1c -->

# Vite và Nuxt (./vite)

Plugin Vite tự động ghi file `theme.css` cho bạn; Nuxt sử dụng nó thông qua `vite.plugins`. Plugin này cần peer dependency tùy chọn `vite` và chạy trong môi trường Node.

Plugin ghi ra cùng file `theme.css` với `generate()`; hãy `@import` file đó ngay cạnh `@import "tailwindcss"`.

## `styleGenVite`

<!-- signature: styleGenVite -->

```ts
export declare const styleGenVite: (opts?: StyleGenViteOptions) => Plugin_2;
```

Vite plugin that emits `theme.css` and `theme.tokens.ts` in `buildStart`, reading `style-gen.config.json` in `root`.
The dev server re-emits on a theme or config edit and sends a full reload; a `buildStart` failure fails the build.

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

**Lưu ý về dev-server.** Trên Vite 5, `buildStart` của một dev server chạy khi gọi `server.listen()` (hoặc trong `middlewareMode`), vì vậy một `createServer()` không bao giờ gọi `listen()` sẽ không ghi ra `theme.css`; từ Vite 6 trở đi plugin thiết lập `perEnvironmentStartEndDuringDev` và `buildStart` cũng chạy cho cả `createServer()` + `ssrLoadModule`. Plugin cũng theo dõi file config: một lần sửa sẽ nạp lại nó tại chỗ (đích được phân giải lại, các file được sinh lại và trang tải lại) mà không khởi động lại server. Cả hai ứng viên (`style-gen.config.json` và `package.json#style-gen`) đều được theo dõi, dù có tồn tại hay chưa, nên việc tạo cái đầu tiên hoặc chuyển config giữa hai file được nhận ra; khi `style-gen.config.json` tồn tại, một sự kiện của `package.json` (`yarn add`) bị bỏ qua. Một lần sửa không dùng được sẽ được ghi log là `[style-gen-vite] Cannot reload config, keeping the previous one:` và config hợp lệ gần nhất vẫn có hiệu lực; một lần sinh lại thất bại được ghi log là `[style-gen-vite] Re-emit failed:` ([Khắc phục sự cố](../troubleshooting.md#cannot-reload-config-và-re-emit-failed)).

**Cấu hình.** `styleGenVite()` (và `styleGenNext()`) đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) từ Vite root (Next: `process.cwd()`): các trường `theme`, `output` (file CSS cần ghi, mặc định là `styles/theme.css`), `tokensOutput` và mọi tùy chọn `generate()` có trong đó, nhờ đó CLI và bundler dùng chung một nguồn chân lý duy nhất. Một config không hợp lệ hoặc sai cú pháp sẽ ném ra lỗi `[style-gen-vite] Invalid config (<file>):` kèm danh sách sự cố — không bao giờ âm thầm fallback về giá trị mặc định. Khi không có config nào, plugin ghi log `No style-gen.config.json or package.json#style-gen found in <root>; using the defaults.` một lần rồi dùng các giá trị mặc định. Mọi tùy chọn plugin ngoài `root` đều ném lỗi ngay lúc gọi.

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
