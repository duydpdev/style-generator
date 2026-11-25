<!-- source: documents/cookbook.md sha256: 0b4f753bd48d -->

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

try {
  generate(theme);
} catch (e) {
  if (e instanceof ZodError) console.error(formatZodError(e));
  throw e;
}
```

## Các class được dựng lúc runtime

Các tên class được dựng lúc runtime (một template literal như `` `bg-${variant}` ``) sẽ vô hình trước lượt quét tĩnh của Tailwind; hãy để chúng xuất hiện nguyên văn trong mã nguồn, hoặc tự khai báo chúng trong CSS của app bằng một directive `@source inline(...)` thuần của Tailwind, đặt cạnh dòng import file được sinh ra, ví dụ `@source inline("hover:bg-{primary,secondary}");`. Xem [Class được tạo lúc runtime](./reference/options.md#class-được-tạo-lúc-runtime).

## Thu gọn các dòng `@source inline` được sinh ra

`coverage` sẽ bỏ qua các dòng `@source inline` của một nhóm token hoặc chỉ giữ lại một số tiền tố hay các key có alias, và `coverage.colors.opacities` thêm các class dạng `bg-primary/10`; xem [`coverage`](./reference/options.md#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token). `DesignTokens.Web.opacities` mang đúng các mức đó; truyền nó vào `createVariantMapper(prefix, colors, { opacities })` để có các key dạng `primary/10` (xem [`createVariantMapper`](./reference/cva.md)).

## Nút chuyển chế độ tối

Một trục theme chuyển cả một tập token chỉ bằng một attribute trên `<html>`; một component nhỏ đặt attribute đó. Hãy khai báo trục trong `theme.json`; mỗi variant chỉ liệt kê các giá trị khác với theme gốc:

```json
{
  "colors": { "background": "#FFFFFF", "foreground": "#111827" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": { "background": "#0B0F19", "foreground": "#F9FAFB" }
      }
    }
  }
}
```

`style-gen generate` (hoặc plugin) phát ra `html[data-theme="dark"] { … }` và ghi `ThemeAxesState` vào `theme.tokens.ts`. `themeAxisAttributes` từ `./recipes` biến state đó thành các attribute, nên component không bao giờ phải tự viết tên attribute:

```tsx
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";

import type { ThemeAxesState } from "./theme.tokens";

const DARK_STATE: ThemeAxesState = { theme: "dark" };

/** `{ "data-theme": "dark" }`; the base theme is the absence of the attribute. */
const DARK = themeAxisAttributes(DARK_STATE);

export function ThemeSwitch() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(DARK)) {
      if (dark) root.setAttribute(name, value);
      else root.removeAttribute(name);
    }
  }, [dark]);

  return (
    <button
      type="button"
      aria-pressed={dark}
      onClick={() => {
        setDark((on) => !on);
      }}
    >
      Dark mode
    </button>
  );
}
```

CSS đọc `data-theme` và component ghi cùng attribute đó từ cùng một công thức, nên hai bên không thể lệch nhau. Hãy render theme gốc trên server (không có attribute) và áp dụng lựa chọn đã lưu sau khi hydrate, để lần render đầu tiên ở client khớp với HTML của server. Với Vue và Nuxt, [`examples/plain-nuxt/app/components/ThemeSwitch.vue`](../../examples/plain-nuxt/app/components/ThemeSwitch.vue) làm điều tương tự thông qua `useHead({ htmlAttrs })`. Xem [Cấu hình theme → `themeAxes`](./reference/theme.md#theme-nhiều-trục-themeaxes).

## Một theme dùng chung cho nhiều app (monorepo)

Hãy giữ `theme.json` trong một package và để mỗi app trỏ đến nó:

```text
packages/theme/theme.json
apps/web/style-gen.config.json
apps/admin/style-gen.config.json
```

```json
{
  "theme": "../../packages/theme/theme.json",
  "output": "src/styles/theme.css",
  "tokensOutput": "src/styles/theme.tokens.ts"
}
```

`theme` có thể nằm ngoài app (một package theme dùng chung); `output` và `tokensOutput` phải nằm trong thư mục gốc của app, nên một app không bao giờ ghi đè file của app khác. Plugin hoặc `style-gen generate` trong mỗi app ghi `theme.css` và `theme.tokens.ts` riêng của app đó; hãy commit file tokens trong từng app, bỏ qua file CSS. Trong CI, hãy chạy phép kiểm tra một lần cho mỗi app:

```bash
yarn workspace web style-gen generate --check
yarn workspace admin style-gen generate --check
```

`--check` không ghi gì và thoát với mã 1 khi `theme.tokens.ts` của một app bị thiếu hoặc không còn khớp với theme và config, nên một lần sửa theme mà không ai sinh lại sẽ làm pipeline thất bại. Xem [CLI → `style-gen generate`](./reference/cli.md#style-gen-generate).

## Làm CI thất bại khi CSS phình ra

`style-gen budget` cộng dung lượng gzip của một file `.css` hoặc của mọi file `.css` trong một thư mục, nên hãy chạy nó sau bước build:

```yaml
- run: yarn build
- run: yarn style-gen budget dist/assets --max-gzip 20000
```

Next.js ghi CSS vào `.next/static/css`; hãy dùng thư mục đó thay cho `dist/assets`. Mã thoát chính là hợp đồng: `0` nằm trong ngân sách, `1` vượt ngân sách (`OVER BUDGET: …`), `2` cho lỗi sử dụng, đích không đọc được hoặc không tìm thấy file `.css` nào, nên một đường dẫn sai làm bước đó thất bại thay vì lặng lẽ pass. Hãy đặt `--max-gzip` cao hơn dung lượng hiện tại một chút (dòng `OK: …` in ra con số này) và hạ xuống khi một thao tác cắt tỉa như `coverage` làm file nhỏ đi. Xem [CLI → `style-gen budget`](./reference/cli.md#style-gen-budget).

Khi bước này thất bại, thêm `--coverage-cost` để xem nhóm class nào của theme tốn dung lượng nhất (nó in sau dòng tóm tắt, kèm thiết lập `coverage` loại bỏ từng nhóm); áp dụng gợi ý đầu tiên trong config, build lại rồi chạy budget một lần nữa để đo mức tiết kiệm. Con số là cận trên: các class mà source của bạn dùng vẫn còn.

## Một recipe component từ các bảng

Một recipe là một hàm từ các prop variant đến một chuỗi class. Các bảng class thuần túy đi vào, `recipeFromTables` (bên dưới là class-variance-authority) trả về recipe, và `createVariantMapper` điền các bảng từ key của theme, nên đổi tên một màu trong `theme.json` sẽ làm build hỏng thay vì phát hành một class chết:

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import { createCn, recipeFromTables } from "@duydpdev/style-generator/ui";

import { tokens } from "./tokens";

const cn = createCn(tokens);

const button = recipeFromTables({
  base: "inline-flex items-center font-medium",
  variants: {
    color: createVariantMapper("bg", tokens.colors, { states: COLOR_STATES }),
    radius: createVariantMapper("rounded", tokens.borderRadius),
  },
  defaultVariants: { color: "primary", radius: "md" },
});

export const className = cn(button({ color: "danger" }), "px-4");
```

`COLOR_STATES` nối các class `hover:`, `active:` và `aria-selected:` vào một màu có các key ngang hàng `…Hover`, `…Active` và `…Selected`; `createCn(tokens)` khiến một `rounded-pill` đứng sau thay thế `rounded-md` đứng trước. `recipeFromTables` trả về một recipe có kiểu, nên một giá trị variant viết sai là lỗi kiểu; hãy để kết quả không chú thích kiểu. Xem [UI kit](./reference/ui.md) và [Xây dựng component](./getting-started/build-components.md).
