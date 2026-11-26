<!-- source: documents/reference/next.md sha256: 4035b3d1269a -->

# Next.js (./next)

Hàm bọc (wrapper) config Next.js tự động ghi file `theme.css` cho bạn. Nó chạy trong môi trường Node và không thêm bất kỳ peer dependency nào.

Nó ghi ra cùng một file `theme.css` (kết quả trả về của `generate()`) như `style-gen generate` và plugin Vite; hãy `@import` file đó ngay cạnh `@import "tailwindcss"`.

## `styleGenNext`

<!-- signature: styleGenNext -->

```ts
export declare const styleGenNext: (
  opts?: StyleGenNextOptions,
) => <TConfig>(
  nextConfig: TConfig,
) => (phase: string, ctx?: NextConfigContext) => ResolvedNextConfig<TConfig>;
```

Next.js config wrapper that emits `theme.css` and `theme.tokens.ts`, read from `style-gen.config.json` in `root`.
Only the dev-server and production-build phases touch the disk; `next dev` also watches and re-emits.

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

Hàm này chỉ sinh `theme.css` và `theme.tokens.ts` khi Next nạp config trong `phase-development-server` (`next dev`, giai đoạn này cũng theo dõi file theme và file config) hoặc `phase-production-build` (`next build`, và các lệnh khác nạp config ở phase này); mọi phase khác (`next start`, export, info, test) đều trả về config mà không đọc theme, do đó một production image không cần chứa file này. `styleGenNext(opts)(nextConfig)` trả về hàm `(phase, ctx) => config` của Next, vì vậy hãy export kết quả của nó như mẫu bên trên. `nextConfig` có thể là một plain object hoặc dạng hàm `(phase, { defaultConfig }) => config`, hàm này sẽ được gọi với các đối số của Next. Sửa file config trong lúc `next dev` đang chạy sẽ nạp lại nó tại chỗ; cả hai ứng viên (`style-gen.config.json` và `package.json#style-gen`) đều được theo dõi, một sự kiện của `package.json` bị bỏ qua khi `style-gen.config.json` tồn tại, và một lần sửa không dùng được sẽ được ghi log là `[style-gen-next] Cannot reload config, keeping the previous one:` trong khi config trước đó vẫn có hiệu lực. Khi không có config nào, plugin ghi log `No style-gen.config.json or package.json#style-gen found in <root>; using the defaults.` một lần rồi dùng các giá trị mặc định. Dev watcher vẫn tiếp tục chạy khi một chỉnh sửa làm cho theme không hợp lệ (lỗi sẽ được ghi log dưới dạng `[style-gen-next] Re-emit failed:` và file `theme.css` hợp lệ gần nhất vẫn được giữ nguyên), và được thay thế khi config được nạp lại với một đường dẫn theme hoặc output khác. `theme` có thể là đường dẫn tuyệt đối hoặc nằm ngoài project; `output` và `tokensOutput` bắt buộc phải nằm bên trong project (`[style-gen-next] output escapes project root: <path>`), và dấu `/` ở đầu được giữ làm đường dẫn tuyệt đối, không bị ghi đè thành đường dẫn tương đối. Giới hạn: các đường dẫn được kiểm tra đối chiếu với thư mục gốc theo đường dẫn logic — một symlink nằm bên trong project nhưng trỏ ra bên ngoài sẽ không bị phát hiện.

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
