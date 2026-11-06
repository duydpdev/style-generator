<!-- source: documents/cookbook.md sha256: 7748b3ef3b68 -->

# Công thức

Các recipe có kích thước theo từng tác vụ; mỗi mục đều liên kết đến trang tham chiếu sở hữu API đó.

## Sinh CSS mà không cần plugin bundler

Quy trình chỉ dùng CLI không cần đến plugin bundler: hãy sinh `theme.css` trước dev server và trước khi build, đồng thời chạy một watcher trong quá trình phát triển:

```json
{
  "scripts": {
    "predev": "style-gen generate",
    "dev": "vite",
    "prebuild": "style-gen generate",
    "build": "vite build"
  }
}
```

```bash
yarn style-gen generate --watch   # second terminal: regenerates on every theme or style-gen.config.json edit
```

npm tự động chạy các script `pre*`; Yarn Berry thì không, vì vậy hãy nối chuỗi các script tại đó (`"dev": "style-gen generate && vite"`). `style-gen.config.json` chứa `theme`, `output` và các tùy chọn cho bộ sinh (`examples/design-system/style-gen.config.json` là một ví dụ hoạt động). Hoặc bạn có thể tự gọi trực tiếp `generate()`:

```ts
import { writeFileSync } from "node:fs";
import {
  generate,
  defineTheme,
  defineOptions,
} from "@duydpdev/style-generator";
import { Breakpoint } from "@duydpdev/style-generator/tokens";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson); // type-checks AND validates at runtime
const options = defineOptions({ breakpoints: [Breakpoint.MD, Breakpoint.LG] });

const { css, tokens } = generate(theme, options);
writeFileSync("styles/theme.css", css, "utf8");
```

## Báo cáo lỗi kiểm tra hợp lệ

`defineTheme()` ném ra một `ZodError` kèm theo đường dẫn vi phạm đối với các key lạ hoặc giá trị không an toàn, và TypeScript sẽ từ chối nếu thiếu `colors` lúc biên dịch. `formatZodError` biến lỗi đó thành một dòng `path → message` cho từng vấn đề:

```ts
import { ZodError } from "zod";
import { generate, formatZodError } from "@duydpdev/style-generator";
import theme from "./theme.json";
import { options } from "./style-gen.options";

try {
  generate(theme, options);
} catch (e) {
  if (e instanceof ZodError) console.error(formatZodError(e));
  throw e;
}
```

## Các class được dựng lúc runtime

Các tên class được dựng lúc runtime (một template literal như `` `bg-${variant}` ``) sẽ vô hình trước lượt quét tĩnh của Tailwind; hãy khai báo chúng bằng `extraSources`, ví dụ `extraSources: ["hover:bg-{primary,secondary}"]`. Xem [`extraSources`](./reference/options.md).

## Thu gọn các dòng `@source inline` được sinh ra

`coverage` sẽ bỏ qua các dòng `@source inline` của một nhóm token hoặc chỉ giữ lại một số tiền tố hay các key có alias, và `coverage.colors.opacities` thêm các class dạng `bg-primary/10`; xem [`coverage`](./reference/options.md#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token). `DesignTokens.Web.opacities` mang đúng các mức đó; truyền nó vào `createVariantMapper(prefix, colors, { opacities })` để có các key dạng `primary/10` (xem [`createVariantMapper`](./reference/cva.md)).
