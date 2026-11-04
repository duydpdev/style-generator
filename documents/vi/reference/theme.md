<!-- source: documents/reference/theme.md sha256: abc840fa9e0c -->

# Cấu hình theme

Cấu trúc của theme JSON mà `generate()`, `defineTheme()` và CLI kiểm tra hợp lệ; chỉ có `colors` là bắt buộc.

`ThemeSchema` là một schema Zod chặt chẽ: key lạ, giá trị không an toàn và tham chiếu không hợp lệ đều ném `ZodError` kèm theo path vi phạm. `generate()`, `defineTheme()`, CLI, `styleGenVite` và `styleGenNext` đều kiểm tra hợp lệ một cách độc lập.

## Cấu hình tối thiểu

Chỉ có `colors` là bắt buộc. Mọi trường khác đều là tùy chọn:

```ts
import { generate } from "@duydpdev/style-generator";

const { css } = generate({
  colors: { primary: "#3B82F6", background: "#FFFFFF" },
});
```

## Ngữ pháp của key

Mọi tên token, tên trục và tên variant phải bắt đầu bằng một chữ cái hoặc chữ số, tiếp theo chỉ gồm các chữ cái, chữ số hoặc dấu `-`. Đặc biệt **`_` bị từ chối** — hãy dùng camelCase như `primaryActive` hoặc kebab-case như `primary-active` — vì `_` sẽ khiến tên class và token có kiểu không khớp nhau. CLI, `styleGenVite` và `styleGenNext` sẽ in gợi ý đó ngay trên path vi phạm (`colors.primary_active → … use camelCase … or kebab-case …`). Hai key trong cùng một record nếu khi chuyển sang kebab-case mà trùng tên (`blue500` và `blue-500`) cũng sẽ bị từ chối. Mỗi nhóm token sở hữu một namespace biến `--sg-<category>-` riêng biệt (`--sg-color-*`, `--sg-shadow-*`, `--sg-sp-*`, …), do đó các key thuộc những nhóm khác nhau không bao giờ xung đột (`colors.shadowPrimary` → `--sg-color-shadow-primary`, `shadows.primary` → `--sg-shadow-primary`). Một key `typography` không được chuyển sang kebab-case thành `sp-*` hoặc `font-*`, và `fontWeight` phải là một số từ 1 đến 1000. Giá trị không được chứa `;`, `{`, `}`, `<`, `@`, `\`, `/*` hay dấu xuống dòng, dấu ngoặc kép phải cân đối, và dấu ngoặc đơn cũng như ngoặc vuông cũng vậy (`rgb(0 0 0` bị từ chối tại path của nó).

## Quy tắc đặt key

Tất cả những gì schema từ chối đối với một cái tên, được tổng hợp tại một nơi (mọi quy tắc đều được báo cáo dưới dạng `path → message`):

| Quy tắc                                                                                                                                                                                                                                       | Áp dụng cho                                                                             | Bị từ chối                                                              | Được chấp nhận                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------- |
| Bắt đầu bằng chữ cái hoặc chữ số, sau đó chỉ gồm chữ cái, chữ số hoặc `-`                                                                                                                                                                     | mọi tên token, trục và variant                                                          | `-primary`, `my color`                                                  | `primary`, `2xl`, `primary-active` |
| Không bao giờ cho phép `_`                                                                                                                                                                                                                    | mọi tên token, trục và variant                                                          | `primary_active`                                                        | `primaryActive`, `primary-active`  |
| Không bắt đầu bằng chuỗi từ hai chữ in hoa trở lên: class do token có kiểu tạo ra (`cTA` → `c-ta`) sẽ khác với class do CSS phát ra (`cta`). Một chữ in hoa đơn lẻ thì hợp lệ                                                                 | mọi tên token, trục và variant                                                          | `CTA`, `ABtn`, `HTMLParser` (đổi tên thành `cta`, `abtn`, `htmlparser`) | `Blue`, `primaryCTA`, `primaryFG`  |
| Các key trong cùng một record bị trùng tên khi chuyển sang kebab-case                                                                                                                                                                         | từng nhóm token và `typography`                                                         | `blue500` + `blue-500`                                                  | `blue500` + `blue600`              |
| Key `typography` khi chuyển sang kebab-case phải là tên `@utility` Tailwind hợp lệ: chữ cái thường đầu tiên, không bắt đầu bằng chữ số hoặc dấu gạch ngang                                                                                    | `typography`                                                                            | `2xl`, `12Mono`                                                         | `text2xl`, `heading1`              |
| Key `fontFamily` không được trùng với tên font-weight của Tailwind khi chuyển sang kebab-case (`thin`, `extralight`, `light`, `normal`, `medium`, `semibold`, `bold`, `extrabold`, `black`)                                                   | `fontFamily` (cả trong override `themeAxes`)                                            | `bold`, `extrabold`                                                     | `sans`, `display`                  |
| Key `borderWidth` không được trùng với key `colors` khi chuyển sang kebab-case (cả hai đều phát ra `border-<key>`)                                                                                                                            | `borderWidth` so với `colors`, theo từng scope                                          | `colors.thinLine` + `borderWidth.thin-line`                             | `colors.line` + `borderWidth.thin` |
| Key `typography` không được trùng với `sp-*` hoặc `font-*` khi chuyển sang kebab-case (nó sẽ che khuất các utility spacing và font)                                                                                                           | `typography`                                                                            | `spBody`, `sp-body`, `fontBold`                                         | `body`, `spacious`                 |
| Key `fontFamily` không được trùng với `weight` / `size` hoặc bắt đầu bằng `weight-` / `size-` khi chuyển sang kebab-case (Tailwind bỏ qua `--font-weight-*` / `--font-size-*` khi coi là font family, nên key sẽ ghi đè thang weight và size) | `fontFamily`                                                                            | `weightBold`, `size-xl`                                                 | `weighty`, `sizeable`              |
| Key `typography` không được trùng với class do nhóm khác phát ra khi chuyển sang kebab-case (`<prefix>-<key>`)                                                                                                                                | `typography` so với `colors`, `borderWidth`, `shadows`, `borderRadius`, `backDropBlurs` | `textPrimary` cạnh `colors.primary`                                     | `text12Mono`, `heading`            |
| Các variant của cùng một trục không được trùng tên khi chuyển sang kebab-case (chúng sẽ dùng chung một selector)                                                                                                                              | `themeAxes.<axis>`                                                                      | `darkMode` + `dark-mode`                                                | `dark`, `highContrast`             |
| Tên trục và variant không được là số nguyên chuẩn                                                                                                                                                                                             | `themeAxes`                                                                             | `100`, `2024`                                                           | `contrast100`, `007`               |

CLI, `styleGenVite` và `styleGenNext` in gợi ý đổi tên ngay trên path vi phạm (ví dụ `colors.CTA → Key "CTA" yields class "cta" in the CSS but "c-ta" through the typed tokens; rename it to "cta" …`).

## Các nhóm token

| Key của theme   | Sinh ra                                                                                                                         | Ghi chú                                                                                                                                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`        | `bg-*`, `text-*`, `border-*` qua `@theme inline` (`--color-*`)                                                                  | Bắt buộc. Phẳng, camelCase.                                                                                                                                                      |
| `typography`    | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                     | Mục nhập: `fontSize`, `lineHeight`, `fontWeight` (số, 1–1000), tùy chọn `letterSpacing`/`fontFamily`/`fontStyle`; thiếu `letterSpacing` thì không phát ra khai báo. Không alias. |
| `shadows`       | `shadow-*`                                                                                                                      |                                                                                                                                                                                  |
| `backDropBlurs` | `backdrop-blur-*`                                                                                                               |                                                                                                                                                                                  |
| `borderRadius`  | `rounded-*` (+ các variant `md:`/`lg:` cho các breakpoint đang hoạt động)                                                       | Dự phòng về `DEFAULT_ROUNDED_VALUES`.                                                                                                                                            |
| `fontFamily`    | `font-*` qua namespace `--font-*` của Tailwind                                                                                  | Key không được là tên font-weight của Tailwind (`bold`, `medium`, …).                                                                                                            |
| `borderWidth`   | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` qua namespace `--border-width-*` của Tailwind (dựa trên `--sg-border-width-*`) | Dự phòng về thang `0/1/2/4` của Tailwind khi bỏ qua hoặc rỗng (`{}`). Thay thế key `border` ở bản 3.x.                                                                           |

## Màu sắc — key dạng camelCase

Các key dùng **camelCase** (hoặc kebab-case); thư viện sẽ chuyển chúng thành biến và class dạng kebab-case. Object lồng nhau và key `DEFAULT` không được hỗ trợ.

| Key của theme       | Biến CSS                     | Class Tailwind            |
| ------------------- | ---------------------------- | ------------------------- |
| `primaryForeground` | `--color-primary-foreground` | `text-primary-foreground` |
| `sidebarForeground` | `--color-sidebar-foreground` | `bg-sidebar-foreground`   |
| `blue500`           | `--color-blue-500`           | `border-blue-500`         |
| `primary`           | `--color-primary`            | `text-primary`            |

> **Quy tắc:** ranh giới chữ cái→chữ số sẽ thêm dấu gạch ngang (`blue500` → `blue-500`). Giá trị bắt đầu bằng chữ số giữ nguyên (`2xl` → `2xl`).

## Alias (`$key`)

Một giá trị `"$<key>"` tham chiếu đến một key khác **trong cùng một nhóm** và được phát ra dưới dạng `var(--<cssVarPrefix>-<kebab-key>)`, trong đó tiền tố thuộc về nhóm đó (`sg-color` cho `colors`, `sg-shadow` cho `shadows`, `sg-backdrop-blur`, `sg-radius`, `sg-font`, `sg-border-width`):

```json
{
  "colors": { "blue500": "#3B82F6", "primary": "$blue500" },
  "shadows": { "base": "0 1px 2px rgb(0 0 0 / 0.1)", "card": "$base" }
}
```

Mục tiêu là key thô (`$blue500`, không phải `$blue-500`), nó phải tồn tại, và đồ thị alias không được có chu trình. Không được phép dùng alias bên trong `typography`. Ví dụ trên phát ra:

```css
:root {
  --sg-color-blue-500: #3b82f6;
  --sg-color-primary: var(--sg-color-blue-500);
  --sg-shadow-base: 0 1px 2px rgb(0 0 0 / 0.1);
  --sg-shadow-card: var(--sg-shadow-base);
}
```

## Các trạng thái tương tác (`primaryHover`, `primaryActive`)

Khai báo các key ngang hàng cạnh một màu và registry sẽ phát ra các utility trạng thái cho chúng:

```json
{
  "colors": {
    "blue600": "#2563EB",
    "blue700": "#1D4ED8",
    "primary": "#3B82F6",
    "primaryHover": "$blue600",
    "primaryActive": "$blue700"
  }
}
```

`primary` giờ đây có thêm `hover:bg-primary-hover` và `active:bg-primary-active` (cùng các dạng `text-`/`border-`). Danh sách trạng thái là hằng số được export `COLOR_STATES` (`["hover", "active"]`); truyền nó vào `createVariantMapper(prefix, tokens, { states: COLOR_STATES })` để nhận chuỗi class, xem [mục 7](./cva.md). Tên trạng thái ở dạng kebab-case (`focusVisible` → `focus-visible:`).

## Theme nhiều trục (`themeAxes`)

`themeAxes` ánh xạ một **tên trục** với các **variant** của nó; mỗi variant chỉ liệt kê các giá trị khác biệt so với base. Nhiều trục có thể cùng hoạt động cùng lúc:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "background": "#FFFFFF",
    "foreground": "#111827"
  },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.1)" },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#60A5FA",
          "background": "#111827",
          "foreground": "#F9FAFB"
        },
        "shadows": { "sm": "0 1px 2px rgba(255,255,255,0.1)" }
      }
    },
    "palette": {
      "forest": { "colors": { "primary": "#16A34A" } },
      "highContrast": { "colors": { "primary": "#000000" } }
    }
  }
}
```

Các selector được sinh ra (sau `:root`, theo thứ tự khai báo):

```css
:root { --sg-color-primary: #3B82F6; … }
html[data-theme="dark"] { --sg-color-primary: #60A5FA; … }
html[data-palette="forest"] { --sg-color-primary: #16A34A; }
html[data-palette="high-contrast"] { --sg-color-primary: #000000; }
```

```html
<html data-theme="dark" data-palette="high-contrast">
  …
</html>
```

Quy tắc:

- **Selector được gắn chặt với `html`.** Một thuộc tính `data-*` trên phần tử bao ngoài không có tác dụng. Lý do là vì alias: một alias `var()` phân giải tại phần tử _khai báo_ custom property (`:root`), do đó override trên bất kỳ phần tử nào khác sẽ không bao giờ chạm tới giá trị của alias.
- **Giá trị thuộc tính là dạng kebab của key**: variant `highContrast` → `data-palette="high-contrast"`; trục `colorScheme` → `data-color-scheme`.
- **Độ ưu tiên theo thứ tự khai báo.** Các selector có độ đặc hiệu ngang nhau, vì vậy khi hai trục cùng override một token thì trục được khai báo **sau** trong JSON sẽ thắng.
- **Tên trục và tên variant không được là số nguyên chuẩn** (`100`, `2024`): JavaScript liệt kê các key giống số trước, điều này sẽ âm thầm phá vỡ thứ tự khai báo. Thay vào đó hãy dùng `contrast100`.
- **Variant không được đặt tên là `base`**: `"base"` là giá trị "không override" của `ThemeAxesState` và `themeAxisAttributes`, do đó một variant mang tên này không bao giờ có thể bật được. `ThemeSchema` từ chối `themeAxes.<axis>.base`; hãy đặt tên là `default` hoặc `standard`. (Một trục có tên là `base` vẫn hợp lệ.)
- **Các key override phải tồn tại sẵn trong record base**; một key chỉ có ở override sẽ không tạo ra utility nào và bị từ chối.
- **Override phức hợp vẫn dùng CSS tự viết tay.** Một override đơn lẻ không thể nhắm vào thuộc tính của hai trục cùng một lúc:

| Trục (nguồn)                                         | Nội dung                                                                                             | Xử lý                                                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme` (`themeAxes.theme.dark`)                     | override màu sắc `--sg-*` + shadows                                                                  | Được sinh bởi thư viện — `html[data-theme="dark"]`                                                                                                                                                   |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override màu sắc `--sg-*`                                                                            | Được sinh bởi thư viện — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                                 |
| hợp chất `[data-theme="dark"][data-palette="…"]`     | override chéo trục (dark × một palette cụ thể)                                                       | CSS tự viết tay: độ đặc hiệu `(0,2,0)` của nó thắng bất kỳ quy tắc `html[data-…]` đơn trục nào `(0,1,1)` bất kể thứ tự trong nguồn                                                                   |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, cùng một quy tắc con lồng `[data-part~="sg-glass-target"]` | CSS tự viết tay: các biến ngoài `--sg-*` và các selector con lồng nhau không thể biểu diễn bằng theme override (xem [`examples/design-system/README.md`](../../../examples/design-system/README.md)) |

Key đơn trục cũ đã được đổi tên; một theme vẫn dùng nó sẽ bị từ chối kèm thông báo trỏ tới `themeAxes`. Xem [hướng dẫn nâng cấp](../migration/3.x-to-4.0.md) để biết thông điệp chính xác và cách viết lại.

## Các biến trung gian `--sg-*`

`--sg-*` là một lớp trung gian: nó tồn tại để phá vỡ tham chiếu vòng tròn xuất hiện khi một theme chuyển đổi một biến mà `@theme inline` cũng định nghĩa.

```css
/* Without the intermediate layer: circular! */
@theme inline {
  --color-primary: var(--color-primary);
}

/* With it: theme switching works */
:root {
  --sg-color-primary: #3b82f6;
}
html[data-theme="dark"] {
  --sg-color-primary: #60a5fa;
}
@theme inline {
  --color-primary: var(--sg-color-primary);
}
```

Nên ưu tiên dùng các class Tailwind tiêu chuẩn và các biến `--color-*` trong mã ứng dụng:

```html
<div class="bg-primary text-foreground">…</div>
```

```css
.custom {
  color: var(--color-primary);
}
```

**Hợp đồng công khai.** Các biến mà generator phát ra (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, `--sg-font-<key>`, `--sg-border-width-<key>`, `--sg-backdrop-blur-<key>`, và các biến spacing nội dòng `--sg-sp-*`) là một phần của output công khai: alias phân giải về chúng, và CSS viết tay có thể đọc hoặc override chúng. Đổi tên một biến là thay đổi phá vỡ tương thích (breaking change) — bản 5.0 đã đổi tên các biến màu từ `--sg-<color>` thành `--sg-color-<key>`. `style-gen doctor` cảnh báo (`file:line`) về các tham chiếu `var(--sg-<colorKey>)` hoặc khai báo `--sg-<colorKey>:` còn sót lại; xem [hướng dẫn 4.x → 5.0](../migration/4.x-to-5.0.md).

## Trùng tên với utility tích hợp sẵn

Một key của theme có class trùng với một utility của Tailwind (`bg-none`, `shadow-none`, `rounded-none`, một key typography trở thành `text-sm`, `h-1` từ `h1`, hoặc `italic`, các màu có tên `transparent`/`current`/`inherit`) thì không bị từ chối, nhưng quy tắc nào thắng sẽ tùy thuộc vào cách hiện thực utility đó của Tailwind. Hãy chọn một cái tên khác (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` liệt kê các xung đột mà nó nhận diện được. Key `borderWidth` chỉ gồm chữ số (`2`) lại khác: từ bản 5.0, giá trị theme sẽ thay thế các class tích hợp sẵn `border-2`, `border-x-2` và `divide-x-2` của Tailwind (Tailwind tra cứu theme trước thang mặc định); `doctor` vẫn báo cáo nó để bạn xác nhận rằng việc override là có chủ đích.
