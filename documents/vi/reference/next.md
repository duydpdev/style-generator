<!-- source: documents/reference/next.md sha256: 36d0712d857c -->

# Next.js (./next)

Hàm bọc (wrapper) config Next.js tự động ghi file `theme.css` cho bạn. Nó chạy trong môi trường Node và không thêm bất kỳ peer dependency nào.

Tất cả các công cụ này đều ghi ra cùng một file `theme.css` (kết quả trả về của `generate()`); hãy chọn công cụ phù hợp với bundler của bạn. Trong mọi trường hợp, hãy `@import` file đó ngay cạnh `@import "tailwindcss"`.

## `styleGenNext`

<!-- signature: styleGenNext -->

```ts
export declare const styleGenNext: (
  opts?: StyleGenNextOptions,
) => <TConfig>(
  nextConfig: TConfig,
) => (phase: string, ctx?: NextConfigContext) => ResolvedNextConfig<TConfig>;
```

Next.js config wrapper that emits `theme.css` and `theme.tokens.ts` from a
theme JSON — equivalent to `styleGenVite` for consumers who don't use Vite.
Deliberately does not import `next`: it stays a plain function of the config
object and phase string, so it works under both webpack and Turbopack
without adding a peer dependency.

Usage in `next.config.mjs`:

```js
import { styleGenNext } from "@duydpdev/style-generator/next";
export default styleGenNext()(nextConfig);
```

Every option lives in `style-gen.config.json` (else
`package.json#style-gen`) in `process.cwd()` — the `theme`, `output`,
`tokensOutput` and every `generate()` option — exactly as
`style-gen generate` reads them. The only plugin option is `root`, the
directory holding that file (a relative one resolves against
`process.cwd()`): `styleGenNext({ root })(nextConfig)`.

Path rules (`resolveProjectPath`, against the root): the theme may live
anywhere (absolute, or `..` out of the project: a monorepo shares one); the
generated files must stay inside it.

Only `phase-development-server` and `phase-production-build` read the
theme and write the files; every other phase (`phase-production-server`,
`phase-export`, `phase-info`, `phase-test`) returns the config without
touching the disk, so a production container need not ship the theme JSON.
A function-form Next config is called with `(phase, ctx)` and its result
is returned.

In `next dev` a change to the config file reloads it in place and
re-emits; an invalid edit is logged and the last valid config stays in
force.

**Limitation:**

- **Symlinks are not `realpath`'d.** `resolveProjectPath` compares the
  logical (non-dereferenced) path against the root; it never calls
  `fs.realpathSync`. An `output` that is itself a symlink living inside
  the project is accepted even if its TARGET resolves outside it — the
  guard only rejects a literal `..`-escaping input path, not a symlink
  whose target escapes after the filesystem resolves it.

<!-- /signature -->

Hoạt động với cả webpack lẫn Turbopack và không import `next`, nhờ đó không thêm bất kỳ peer dependency nào:

```ts
// next.config.ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {};

export default styleGenNext()(nextConfig);
```

```json
{
  "theme": "app/theme/theme.json",
  "output": "app/theme/theme.css"
}
```

```css
/* app/globals.css */
@import "tailwindcss";
@import "./theme/theme.css";
```

Hàm này chỉ sinh `theme.css` và `theme.tokens.ts` khi Next nạp config trong `phase-development-server` (`next dev`, giai đoạn này cũng theo dõi file theme và file config) hoặc `phase-production-build` (`next build`, và các lệnh khác nạp config ở phase này); mọi phase khác (`next start`, export, info, test) đều trả về config mà không đọc theme, do đó một production image không cần chứa file này. `styleGenNext(opts)(nextConfig)` trả về hàm `(phase, ctx) => config` của Next, vì vậy hãy export kết quả của nó như mẫu bên trên. `nextConfig` có thể là một plain object hoặc dạng hàm `(phase, { defaultConfig }) => config`, hàm này sẽ được gọi với các đối số của Next. Sửa file config trong lúc `next dev` đang chạy sẽ nạp lại nó tại chỗ. Dev watcher vẫn tiếp tục chạy khi một chỉnh sửa làm cho theme không hợp lệ (lỗi sẽ được ghi log và file `theme.css` hợp lệ gần nhất vẫn được giữ nguyên), và được thay thế khi config được nạp lại với một đường dẫn theme hoặc output khác. `theme` có thể là đường dẫn tuyệt đối hoặc nằm ngoài project; `output` và `tokensOutput` bắt buộc phải nằm bên trong project (`[style-gen-next] output escapes project root: <path>`) và dấu `/` ở đầu **không** còn bị ghi đè thành đường dẫn tương đối nữa. Giới hạn: các đường dẫn được kiểm tra đối chiếu với `process.cwd()` theo đường dẫn logic — một symlink nằm bên trong project nhưng trỏ ra bên ngoài sẽ không bị phát hiện.

## `StyleGenNextOptions`

<!-- signature: StyleGenNextOptions -->

```ts
export declare interface StyleGenNextOptions {
  root?: string;
}
```

Options of `styleGenNext()`, which wraps a Next.js config and emits `theme.css` and `theme.tokens.ts` for `next dev` and `next build`.

<!-- /signature -->

Các tùy chọn của `styleGenNext()`: thư mục chứa `style-gen.config.json`.
