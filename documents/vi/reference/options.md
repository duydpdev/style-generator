<!-- source: documents/reference/options.md sha256: 1d0fcd0ef72f -->

# Tùy chọn

`StyleGeneratorOptions`: tham số thứ hai của `generate()` và, dưới dạng các key JSON, các tùy chọn bộ sinh của `style-gen.config.json`, file mà CLI và cả hai plugin bundler đọc. File config cũng chấp nhận `"$schema": "./style-gen.config.schema.json"` (do `style-gen schema` ghi) để editor tự hoàn thành các key của nó; xem [CLI](./cli.md#file-cấu-hình).

`generate(theme, options)` nhận `StyleGeneratorOptions`; mọi key dưới đây cũng hợp lệ trong `style-gen.config.json`:

| Tùy chọn                  | Kiểu                                                                                     | Mặc định                     | Mô tả                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :------------------------ | :--------------------------------------------------------------------------------------- | :--------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakpoints`             | `readonly (Breakpoint \| string)[]`                                                      | `["md", "lg"]`               | Các breakpoint cho các variant responsive của `@source inline`, chuỗi giá trị dự phòng cho spacing và `DesignTokens.Web.breakpoints`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `screens`                 | `Record<string, string>`                                                                 | `defaultScreens`             | Các độ rộng màn hình tùy chỉnh (được phát ra dưới dạng `@theme { --breakpoint-* }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `enableResponsive`        | `boolean`                                                                                | `true`                       | Sinh các chuỗi giá trị dự phòng responsive cho spacing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `spacing.enabled`         | `boolean`                                                                                | `true`                       | Phát ra các utility `.sp-*`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `spacing.properties`      | `SpacingPropertyMap`                                                                     | `DEFAULT_SPACING_PROPERTIES` | Thay thế map từ spacing key → CSS properties (`{ p: ["padding"] }`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `typography.cssVarDriven` | `boolean`                                                                                | `false`                      | Phát ra các biến `--typography-<name>-<prop>` trong `:root` và tham chiếu đến chúng từ mỗi utility typography, nhờ đó một token đơn lẻ có thể được override trong CSS.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `coverage`                | `Partial<Record<CategoryKey, boolean \| CoverageRule>>` (`colors` cũng nhận `opacities`) | phủ đầy đủ mọi nhóm token    | Cắt tỉa các dòng `@source inline` của một nhóm token (`false`, `{ prefixes }`, `{ keys: "aliased" }`) hoặc thêm các class modifier độ mờ của màu sắc (`{ opacities }`). Xem [`coverage`](#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `resetTailwindDefaults`   | `readonly ("colors" \| "radius" \| "shadow")[]`                                          | `[]`                         | Xóa sạch các namespace mặc định có sẵn của Tailwind để chỉ tồn tại các token của theme. Mỗi tên sẽ thêm `--color-*: initial;`, `--radius-*: initial;` hoặc `--shadow-*: initial;` làm những dòng **đầu tiên** của `@theme inline`. `"colors"` cũng xóa bỏ `--color-white`/`--color-black` (hãy khai báo chúng trong `colors` nếu bạn cần dùng); các utility tĩnh như `rounded-full`, `rounded-none`, `shadow-none` và các họ `inset-`/`drop-`/`text-shadow` vẫn được giữ nguyên. Mỗi tên cần có một phần thay thế không rỗng trong theme: `"colors"` yêu cầu `colors` (không rỗng), `"radius"` yêu cầu `borderRadius` và `"shadow"` yêu cầu `shadows` (ngược lại `generate()` ném `resetTailwindDefaults.<i>`: việc xóa mặc định mà không có phần thay thế sẽ khiến `bg-red-500`/`rounded-md`/`shadow-md` không biên dịch ra gì). Trùng lặp và thứ tự không làm thay đổi kết quả đầu ra. |

### Các key chỉ có trong config

Các key này chỉ tồn tại trong `style-gen.config.json`; `generate()` từ chối chúng trong tham số options.

| Key            | Kiểu     | Mặc định                        | Mô tả                                                                                                                                     |
| :------------- | :------- | :------------------------------ | :---------------------------------------------------------------------------------------------------------------------------------------- |
| `theme`        | `string` | `styles/theme.json`             | Đường dẫn file theme JSON, tính từ thư mục gốc của dự án. Có thể trỏ ra ngoài dự án (một package design system dùng chung).               |
| `output`       | `string` | `styles/theme.css`              | Đường dẫn file CSS được sinh ra, tính từ thư mục gốc của dự án; phải nằm bên trong thư mục đó.                                            |
| `tokensOutput` | `string` | `theme.tokens.ts` cạnh `output` | Module tokens được sinh ra (`.ts`, `.mts` hoặc `.cts`, không phải `.d.ts`), tính từ thư mục gốc của dự án; phải nằm bên trong thư mục đó. |
| `$schema`      | `string` | không có                        | Con trỏ cho editor tới `style-gen.config.schema.json`; được chấp nhận trong file, bị bỏ khi đọc, không bao giờ tới `generate()`.          |

### Screens mặc định

`screens` được gộp lên trên các screen mặc định của Tailwind; đây là các giá trị khi `screens` chưa đặt (`defaultScreens`, export từ `./tokens`):

| Key   | Độ rộng  |
| :---- | :------- |
| `sm`  | `640px`  |
| `md`  | `768px`  |
| `lg`  | `1024px` |
| `xl`  | `1280px` |
| `2xl` | `1536px` |

### Một ví dụ cho mỗi key

Mỗi đoạn dưới đây tự nó là một `style-gen.config.json` hợp lệ.

`breakpoints`: các variant responsive cần bao phủ (`md`, `lg` khi chưa đặt):

```json
{ "breakpoints": ["md", "lg", "xl"] }
```

`screens`: đổi một độ rộng hoặc thêm một screen (mọi giá trị phải cùng đơn vị với các giá trị mặc định):

```json
{ "screens": { "md": "800px", "3xl": "1920px" }, "breakpoints": ["md", "3xl"] }
```

`enableResponsive`: bỏ các chuỗi fallback spacing responsive:

```json
{ "enableResponsive": false }
```

`spacing`: thay bản đồ key → thuộc tính CSS (`spacing.enabled: false` tắt các utility `.sp-*`):

```json
{ "spacing": { "properties": { "p": ["padding"], "gap": ["gap"] } } }
```

`typography`: tham chiếu các biến `--typography-<name>-<prop>` từ mỗi utility typography:

```json
{ "typography": { "cssVarDriven": true } }
```

`coverage`: cắt tỉa các dòng `@source inline` (xem [`coverage`](#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token)):

```json
{
  "coverage": {
    "colors": { "prefixes": ["bg", "text"], "keys": "aliased" },
    "shadows": false
  }
}
```

`resetTailwindDefaults`: xóa các namespace dựng sẵn của Tailwind:

```json
{ "resetTailwindDefaults": ["colors", "radius", "shadow"] }
```

`theme`, `output`, `tokensOutput` và `$schema`:

```json
{
  "$schema": "./style-gen.config.schema.json",
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "tokensOutput": "src/theme/theme.tokens.ts"
}
```

### `resetTailwindDefaults`: chỉ giữ lại token của theme

Tailwind giữ thang màu, `rounded-*` và `shadow-*` của riêng nó bên cạnh các token của theme. Hãy nêu tên một namespace trong `resetTailwindDefaults` để xóa nó:

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, { resetTailwindDefaults: ["colors", "radius", "shadow"] });
```

Mỗi tên thêm dòng `initial` của nó vào đầu khối `@theme inline`. `style-gen doctor` báo cáo một tên không có phần thay thế trong theme, đó cũng chính là lỗi mà `generate()` ném ra.

### Class được tạo lúc runtime

Các tên class được tạo lúc runtime (template literal như `` `bg-${variant}` ``) không thể nhìn thấy đối với quá trình quét tĩnh của Tailwind. Generator không có tùy chọn nào cho chúng: hãy tự khai báo trong CSS của app, ngay cạnh dòng import file được sinh ra, bằng một directive `@source inline(...)` thuần của Tailwind:

```css
@import "tailwindcss";
@import "./theme.css";
@source inline("hover:bg-{primary,secondary}");
```

Mọi key khác đều là key lạ và khiến `generate()` ném `ZodError` (`unrecognized_keys`).

`generate()` kiểm tra hợp lệ mọi tùy chọn chạm tới CSS và ném `ZodError` chỉ rõ path: các key tùy chọn lạ (cả bên trong `spacing` và `typography`) đều bị từ chối; `enableResponsive`, `spacing.enabled` và `typography.cssVarDriven` phải là boolean; các mục nhập trong `breakpoints`, các key của `screens` và `spacing.properties` phải tuân theo ngữ pháp đặt key của theme (chữ cái, chữ số, `-`); các giá trị của `screens` phải là một độ dài tính theo px, rem hoặc em, và map sau khi merge với `defaultScreens` (vốn dùng px) phải sử dụng một đơn vị duy nhất (được báo cáo tại `screens`); mỗi mục trong `breakpoints` phải gọi tên một màn hình trong `defaultScreens` hoặc `screens` (được báo cáo tại `breakpoints.<i>`); các tên thuộc tính CSS bên trong `spacing.properties` phải viết thường (`padding`, `column-gap`, `--custom`).

### `coverage`: cắt tỉa các dòng `@source inline` theo từng nhóm token

Theo mặc định, mỗi nhóm token nhận một dòng `@source inline` bao phủ toàn bộ key của nó (và mọi tiền tố `bg-`/`text-`/`border-`/`ring-`/`outline-`/`divide-`/`placeholder-` cho colors). Đó là giá trị mặc định an toàn, nhưng một bảng màu lớn sẽ khiến dòng này rất dài. `coverage` cắt tỉa nó theo từng nhóm token (`colors`, `typography`, `shadows`, `backdropBlurs`, `borderRadius`, `fontFamily`, `borderWidth`, `motionDuration`, `motionEasing`, `controlHeight`, `iconSize`, `opacity`, `zIndex`):

| `coverage.<category>`        | Tác dụng                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| :--------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| không khai báo, `true`, `{}` | Kết quả như hiện tại, từng byte một.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `false`                      | Không phát ra dòng `@source inline` cho nhóm token đó, và không có dòng trạng thái nào (`hover:`, `active:`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `{ prefixes: [...] }`        | Chỉ giữ lại các tiền tố class được liệt kê (`bg`, `rounded-t`, …). Mỗi tiền tố phải thuộc về nhóm token đó, nếu không `generate()` sẽ ném lỗi; typography không có tiền tố nào (các key của nó chính là tên class).                                                                                                                                                                                                                                                                                                                                                            |
| `{ keys: "aliased" }`        | Chỉ giữ lại các key có giá trị là alias `"$<key>"` (các token giữ alias), trong base record hoặc trong bất kỳ override `themeAxes` nào. Các primitive mà chúng trỏ đến không cần class. Các dòng trạng thái tuân theo quy tắc: `hover:bg-x-hover` chỉ tồn tại khi cả `x` và `xHover` đều tồn tại. Không cho phép với `typography` (không có alias).                                                                                                                                                                                                                            |
| `{ keys: "all" }`            | Mặc định: tất cả các key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `{ opacities: [10, 20] }`    | Chỉ dành cho `colors`. Thêm một dòng phụ, `{bg,text,border,ring,outline,divide,placeholder}-{<keys>}/{10,20}`, ngay sau dòng colors: cùng các tiền tố và key (nó tuân theo `prefixes` và `keys`) với modifier độ mờ `/<n>` của Tailwind, nhờ đó `bg-primary/10` tồn tại ngay cả khi không có file mã nguồn nào nhắc đến nó. Các số nguyên phân biệt từ 1–100, không rỗng; được phát ra theo thứ tự tăng dần. Không kết hợp với các dòng trạng thái (`hover:bg-primary-hover/10` không được bao phủ). Bất kỳ nhóm token nào khác đều ném lỗi (`coverage.<category>.opacities`). |

Sáu nhóm thang đo (`motionDuration`, `motionEasing`, `controlHeight`, `iconSize`, `opacity`, `zIndex`) chỉ có một tiền tố class và không có alias, nên quy tắc của chúng là `true`, `false` hoặc `{ keys: "all" }`: `prefixes` và `keys: "aliased"` sẽ ném lỗi. Nhóm `opacity` là một utility có tên (`opacity-disabled`), không phải các bước alpha màu của `coverage.colors.opacities` (xem [Các nhóm thang đo](./theme.md#các-nhóm-thang-đo)).

`prefixes`, `keys` và `opacities` có thể kết hợp với nhau; danh sách `prefixes` và `opacities` không được rỗng. Với `keys: "aliased"` mà không có token giữ alias nào trong nhóm (hoặc không khai báo key nào), sẽ không có gì được phát ra: các giá trị mặc định tích hợp sẵn không bao giờ là alias. `coverage` chỉ thay đổi `@source inline`: `@theme inline`, các khối `@utility` và `DesignTokens` có kiểu đều giữ nguyên không đổi (ngoại trừ `DesignTokens.Web.opacities`, liệt kê các bước thường của `opacities`), vì vậy một class bạn vẫn dùng nhưng không còn được bao phủ thì phải xuất hiện nguyên văn trong mã nguồn của bạn hoặc được khai báo bằng một `@source inline(...)` trong CSS của app.

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg", "text"], keys: "aliased" },
    borderRadius: { prefixes: ["rounded"] },
    shadows: false,
  },
});
```

`@source inline` buộc mọi class được liệt kê phải vào bản build bất kể nó có được dùng hay không, vì vậy `coverage.colors.opacities` làm tăng kích thước stylesheet của **bạn** thêm `prefixes × keys × steps` class. Mặc định bao phủ bảy tiền tố màu (`bg`, `text`, `border`, `ring`, `outline`, `divide`, `placeholder`), nên chi phí tăng theo `prefixes`: hãy rút gọn nó về những gì bạn dùng, ví dụ `prefixes: ["bg"]` cùng `keys: "aliased"`, đồng thời theo dõi CSS của bạn bằng [`style-gen budget`](./cli.md#style-gen-budget). Một class có độ mờ không nằm trong danh sách vẫn hoạt động bình thường khi nó xuất hiện nguyên văn trong một file mã nguồn được quét.

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: { prefixes: ["bg"], keys: "aliased", opacities: [10, 20] },
  },
});
```

**Group độ mờ.** Một `bg-foreground/32` không nên tốn cả một dòng `prefixes × keys`. Bên cạnh các bước thường, một entry của `opacities` có thể là một group `{ steps, prefixes?, keys? }`: nó thêm một dòng `@source inline` nữa chỉ cho các bước của riêng nó, đặt sau dòng của các bước thường, theo thứ tự khai báo. `steps` là danh sách không rỗng các số nguyên phân biệt từ 1–100 (được phát ra theo thứ tự tăng dần). `prefixes` (không rỗng, mỗi phần tử là một tiền tố của `colors`) và `keys` (không rỗng, mỗi phần tử là một key của `theme.colors`) mặc định là các tiền tố và key mà rule đang bao phủ. Một phần tử `prefixes` không phải tiền tố của `colors` sẽ ném lỗi tại `coverage.colors.opacities.<i>.prefixes.<j>`, một phần tử `keys` không phải màu của theme sẽ ném lỗi tại `coverage.colors.opacities.<i>.keys.<j>` (`Unknown color key "…" in an opacity group`), và một member lạ hoặc một danh sách rỗng cũng ném lỗi. Option không có group phát ra đúng CSS như trước. Một bước vừa là bước thường vừa nằm trong một group phủ cùng một class hai lần, và hai group giống hệt nhau lặp lại cùng một dòng `@source inline`; Tailwind chỉ tạo mỗi class một lần. `DesignTokens.Web.opacities` chỉ liệt kê các bước thường: một group nêu `prefixes` và `keys` riêng, không nhất thiết trùng với rule, nên `createVariantMapper` không đưa `foreground/32` vào làm key, và class đó được viết nguyên văn ở nơi dùng.

```ts
import { generate } from "@duydpdev/style-generator";
import theme from "./theme.json";

generate(theme, {
  coverage: {
    colors: {
      prefixes: ["bg", "text", "border"],
      opacities: [
        5,
        10,
        { steps: [32], prefixes: ["bg"], keys: ["foreground"] },
      ],
    },
  },
});
```

Cấu hình này phát ra `{bg,text,border}-{<keys>}/{5,10}` rồi `{bg}-{foreground}/{32}`, nên `bg-foreground/32` tồn tại mà không cần dòng đầy đủ mà thêm một bước thường sẽ kéo theo.

### Giới hạn của JSON Schema

`style-gen schema` ghi JSON Schema của `style-gen.config.json`, và một editor đọc nó qua `"$schema"` sẽ đánh dấu key hoặc giá trị sai ngay khi bạn gõ. Schema mang các quy tắc key và giá trị mà bộ sinh của nó ánh xạ vào: các key được chấp nhận, hình dạng giá trị, và, với mỗi nhóm `coverage`, chỉ `prefixes` của riêng nhóm đó (không có cho `typography`), `opacities` là các số nguyên khác nhau hoặc các group mà `prefixes` là tiền tố của `colors` (chỉ cho `colors`) và `keys: "aliased"` chỉ ở nơi có alias `$`. Một file schema đã commit giữ các key của phiên bản đã ghi ra nó: hãy chạy `yarn style-gen schema` sau khi nâng cấp package.

Nó không thể diễn đạt một quy tắc so sánh hai key, đọc một file khác hoặc ràng buộc một đường dẫn, nên editor có thể chấp nhận một config mà `generate`, `style-gen doctor` và các plugin bundler từ chối:

- mỗi entry của `breakpoints` phải trỏ tới một screen trong `defaultScreens` hoặc `screens`;
- `screens`, sau khi gộp với các screen mặc định, phải dùng cùng một đơn vị;
- mỗi tên trong `resetTailwindDefaults` cần nhóm thay thế của nó trong theme;
- `output` và `tokensOutput` nằm trong thư mục gốc dự án, `tokensOutput` là file `.ts`, `.mts` hoặc `.cts` (schema chỉ gõ nó là chuỗi và không nêu đuôi file), và theme, CSS, module tokens, `style-gen.config.json` cùng `package.json` là các file khác nhau.

Phần mô tả của `breakpoints` và `screens` trong schema có nói điều này. Hãy chạy `yarn style-gen doctor` để có kết luận đầy đủ.
