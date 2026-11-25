<!-- source: documents/reference/theme.md sha256: a08f47efdd7c -->

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

## Một theme dùng đủ mọi nhóm token

Một theme dùng mọi nhóm token (`$schema` là con trỏ cho editor, xem [Tự hoàn thành trong editor](#tự-hoàn-thành-trong-editor)):

```json
{
  "$schema": "./theme.schema.json",
  "colors": {
    "blue500": "#3B82F6",
    "primary": "$blue500",
    "primaryForeground": "#FFFFFF",
    "background": "#FFFFFF",
    "muted": "#8E8E93"
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "backdropBlurs": { "sm": "4px" },
  "borderRadius": { "md": "8px" },
  "fontFamily": { "sans": "\"Inter\", system-ui, sans-serif" },
  "borderWidth": { "thin": "1px" },
  "motionDuration": { "fast": "150ms" },
  "motionEasing": { "standard": "cubic-bezier(0.2, 0, 0, 1)" },
  "controlHeight": { "md": "40px" },
  "iconSize": { "sm": "16px" },
  "opacity": { "disabled": 0.4 },
  "zIndex": { "modal": 50 }
}
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
| Key `colors` không được trùng với `x`, `y`, `x-<integer>`/`y-<integer>` hoặc `x-<borderWidth key>`/`y-<borderWidth key>` khi chuyển sang kebab-case (`divide-<key>` sẽ là một độ rộng divider của Tailwind)                                   | `colors` so với `borderWidth`                                                           | `x`, `y2`, `xThin` + `borderWidth.thin`                                 | `xl`, `yellow`                     |
| Key `typography` không được trùng với `sp-*` hoặc `font-*` khi chuyển sang kebab-case (nó sẽ che khuất các utility spacing và font)                                                                                                           | `typography`                                                                            | `spBody`, `sp-body`, `fontBold`                                         | `body`, `spacious`                 |
| Key `fontFamily` không được trùng với `weight` / `size` hoặc bắt đầu bằng `weight-` / `size-` khi chuyển sang kebab-case (Tailwind bỏ qua `--font-weight-*` / `--font-size-*` khi coi là font family, nên key sẽ ghi đè thang weight và size) | `fontFamily`                                                                            | `weightBold`, `size-xl`                                                 | `weighty`, `sizeable`              |
| Key `typography` không được trùng với class do nhóm khác phát ra khi chuyển sang kebab-case (`<prefix>-<key>`)                                                                                                                                | `typography` so với `colors`, `borderWidth`, `shadows`, `borderRadius`, `backdropBlurs` | `textPrimary` cạnh `colors.primary`                                     | `text12Mono`, `heading`            |
| Các variant của cùng một trục không được trùng tên khi chuyển sang kebab-case (chúng sẽ dùng chung một selector)                                                                                                                              | `themeAxes.<axis>`                                                                      | `darkMode` + `dark-mode`                                                | `dark`, `highContrast`             |
| Key `__proto__` không bao giờ được phép (nó chỉ có thể đến từ JSON đã parse)                                                                                                                                                                  | mọi tên token, trục và variant, ở mọi độ sâu                                            | `__proto__`                                                             | mọi tên khác                       |
| Tên trục và variant không được là số nguyên chuẩn                                                                                                                                                                                             | `themeAxes`                                                                             | `100`, `2024`                                                           | `contrast100`, `007`               |

CLI, `styleGenVite` và `styleGenNext` in gợi ý đổi tên ngay trên path vi phạm (ví dụ `colors.CTA → Key "CTA" yields class "cta" in the CSS but "c-ta" through the typed tokens; rename it to "cta" …`).

Một key `__proto__` bị từ chối đúng tại path của nó ở bất cứ chỗ nào xuất hiện trong theme. Key này chỉ có thể đến từ một tài liệu JSON đã parse, và nếu không có bước kiểm tra này thì token sẽ bị bỏ qua một cách âm thầm:

```json
{
  "colors": { "primary": "#3B82F6", "__proto__": "#000000" }
}
```

```text
Invalid theme (styles/theme.json):
colors.__proto__ → "__proto__" is not a valid token name
```

## Các nhóm token

| Key của theme    | Sinh ra                                                                                                                         | Ghi chú                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`         | `bg-*`, `text-*`, `border-*` qua `@theme inline` (`--color-*`)                                                                  | Bắt buộc. Phẳng, camelCase.                                                                                                                                                      |
| `typography`     | `@utility <kebab-key>` (`text16Medium` → `.text-16-medium`)                                                                     | Mục nhập: `fontSize`, `lineHeight`, `fontWeight` (số, 1–1000), tùy chọn `letterSpacing`/`fontFamily`/`fontStyle`; thiếu `letterSpacing` thì không phát ra khai báo. Không alias. |
| `shadows`        | `shadow-*`                                                                                                                      |                                                                                                                                                                                  |
| `backdropBlurs`  | `backdrop-blur-*`                                                                                                               |                                                                                                                                                                                  |
| `borderRadius`   | `rounded-*` (+ các variant `md:`/`lg:` cho các breakpoint đang hoạt động)                                                       | Dự phòng về `DEFAULT_ROUNDED_VALUES`.                                                                                                                                            |
| `fontFamily`     | `font-*` qua namespace `--font-*` của Tailwind                                                                                  | Key không được là tên font-weight của Tailwind (`bold`, `medium`, …).                                                                                                            |
| `borderWidth`    | `border`, `border-x/y/t/r/b/l/s/e`, `divide-x/y` qua namespace `--border-width-*` của Tailwind (dựa trên `--sg-border-width-*`) | Dự phòng về thang `0/1/2/4` của Tailwind khi bỏ qua hoặc rỗng (`{}`). Thay thế thang độ rộng `border` của Tailwind.                                                              |
| `motionDuration` | `duration-*` qua `--transition-duration-*` (dựa trên `--sg-duration-*`)                                                         | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |
| `motionEasing`   | `ease-*` qua `--ease-*` (dựa trên `--sg-ease-*`)                                                                                | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |
| `controlHeight`  | `h-control-*` qua `--height-control-*` (dựa trên `--sg-control-*`)                                                              | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |
| `iconSize`       | `size-icon-*` qua `--size-icon-*` (dựa trên `--sg-icon-*`)                                                                      | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |
| `opacity`        | `opacity-*` qua `--opacity-*` (`calc(var(--sg-opacity-*) * 100%)`)                                                              | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |
| `zIndex`         | `z-*` qua `--z-index-*` (dựa trên `--sg-z-*`)                                                                                   | Xem [Các nhóm thang đo](#các-nhóm-thang-đo).                                                                                                                                     |

## Các nhóm thang đo

Sáu nhóm thang đo (`motionDuration`, `motionEasing`, `controlHeight`, `iconSize`, `opacity`, `zIndex`) là các thang literal tùy chọn: mỗi giá trị là một literal theo ngữ pháp bên dưới, không bao giờ là alias `$`, và `coverage` chỉ bật hoặc tắt cả nhóm (xem [`coverage`](./options.md#coverage-cắt-tỉa-các-dòng-source-inline-theo-từng-nhóm-token)). Mỗi class đọc biến `--sg-*` của nó qua một namespace theme của Tailwind, nên một override `themeAxes` cho key đã khai báo (`"motion": { "reduced": { "motionDuration": { "fast": "0ms" } } }`) sẽ đổi class đó lúc chạy.

| Nhóm             | Giá trị                                                                                                                                                                         | Class (thuộc tính)                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `motionDuration` | Một khoảng thời gian bằng `ms` hoặc `s` (`150ms`, `0.2s`)                                                                                                                       | `duration-<key>` (`transition-duration`)    |
| `motionEasing`   | `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`, `step-start`, `step-end`, `cubic-bezier(x1, y1, x2, y2)` với `x1` và `x2` trong khoảng 0–1, hoặc `steps(n[, position])` | `ease-<key>` (`transition-timing-function`) |
| `controlHeight`  | Một độ dài bằng `px` hoặc `rem`                                                                                                                                                 | `h-control-<key>` (`height`)                |
| `iconSize`       | Một độ dài bằng `px` hoặc `rem`                                                                                                                                                 | `size-icon-<key>` (`width` và `height`)     |
| `opacity`        | Một số JSON từ 0 đến 1                                                                                                                                                          | `opacity-<key>` (`opacity`)                 |
| `zIndex`         | Một số nguyên JSON                                                                                                                                                              | `z-<key>` (`z-index`)                       |

**Key `opacity` đặt theo vai trò, không bao giờ theo số.** Nhóm `opacity` đặt tên cho độ mờ của phần tử: `"opacity": { "disabled": 0.4 }` phát ra utility `opacity-disabled` (`opacity: calc(var(--sg-opacity-disabled) * 100%)`). Key có tên cũng dùng được làm modifier màu: `bg-primary/disabled` trộn màu ở mức `calc(var(--sg-opacity-disabled) * 100%)`. Mapping nhân với `100%` vì `color-mix()` chỉ nhận giá trị phần trăm; `--sg-opacity-*` vẫn giữ số 0–1 của theme. `coverage.colors.opacities` thêm các modifier alpha dạng số cho class màu: `"coverage": { "colors": { "opacities": [50] } }` bao phủ `bg-primary/50`. Cả hai đều đọc namespace `--opacity-*` của Tailwind: key `50` sẽ thay bước `/50` của mọi class màu bằng giá trị của theme, nên key `opacity` chỉ gồm chữ số bị từ chối. `DesignTokens.Web.opacity` liệt kê các key của nhóm, còn `DesignTokens.Web.opacities` liệt kê các bước của coverage.

**`controlHeight` cũng cấp cho `min-h-*` và `max-h-*`.** Tailwind đọc `--height-control-*` cho cả `min-h-control-<key>` và `max-h-control-<key>`, và `createTailwindMergeExtension` xếp chúng vào nhóm `min-h`/`max-h`. `@source inline` chỉ bao phủ `h-control-<key>`: hai class còn lại được bộ quét mã nguồn của app nhận ra ở nơi chúng được viết. Tương tự, `--opacity-*` cũng cấp cho `backdrop-opacity-<key>`, được `createTailwindMergeExtension` xếp vào nhóm `backdrop-opacity` và không được `@source inline` bao phủ.

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

## Tự hoàn thành trong editor

```bash
yarn style-gen schema
```

`style-gen schema` ghi `theme.schema.json` cạnh file theme và `style-gen.config.schema.json` ở thư mục gốc dự án. Hãy thêm `"$schema": "./theme.schema.json"` vào theme và `"$schema": "./style-gen.config.schema.json"` vào `style-gen.config.json`, và editor sẽ gợi ý các key và đánh dấu key lạ. Các schema mô tả key và hình dạng giá trị; những phép kiểm tra so sánh các giá trị với nhau (alias, trùng tên, `breakpoints` so với `screens`) chạy trong `generate`, các plugin và `style-gen doctor`.

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

- **Selector được gắn chặt với `html`, và thuộc tính luôn là `data-<axis-kebab>`.** Một thuộc tính `data-*` trên phần tử bao ngoài không có tác dụng. Lý do là vì alias: một alias `var()` phân giải tại phần tử _khai báo_ custom property (`:root`), do đó override trên bất kỳ phần tử nào khác sẽ không bao giờ chạm tới giá trị của alias. Theme giới hạn trong một phần tử hoặc tên thuộc tính tùy chỉnh là CSS tự viết trong app của bạn.
- **Giá trị thuộc tính là dạng kebab của key**: variant `highContrast` → `data-palette="high-contrast"`; trục `colorScheme` → `data-color-scheme`.
- **Độ ưu tiên theo thứ tự khai báo.** Các selector có độ đặc hiệu ngang nhau, vì vậy khi hai trục cùng override một token thì trục được khai báo **sau** trong JSON sẽ thắng.
- **Tên trục và tên variant không được là số nguyên chuẩn** (`100`, `2024`): JavaScript liệt kê các key giống số trước, điều này sẽ âm thầm phá vỡ thứ tự khai báo. Thay vào đó hãy dùng `contrast100`.
- **Variant không được đặt tên là `base`**: `"base"` là giá trị "không override" của `ThemeAxesState` và `themeAxisAttributes`, do đó một variant mang tên này không bao giờ có thể bật được. `ThemeSchema` từ chối `themeAxes.<axis>.base`; hãy đặt tên là `default` hoặc `standard`. (Một trục có tên là `base` vẫn hợp lệ.)
- **Các key override phải tồn tại sẵn trong record base**; một key chỉ có ở override sẽ không tạo ra utility nào và bị từ chối.
- **Override phức hợp vẫn dùng CSS tự viết tay.** Một override đơn lẻ không thể nhắm vào thuộc tính của hai trục cùng một lúc:

| Trục (nguồn)                                         | Nội dung                                                                                 | Xử lý                                                                                                                                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `theme` (`themeAxes.theme.dark`)                     | override màu sắc `--sg-*` + shadows                                                      | Được sinh bởi thư viện — `html[data-theme="dark"]`                                                                                                                                                   |
| `palette` (`themeAxes.palette.{forest,sunset,mono}`) | override màu sắc `--sg-*`                                                                | Được sinh bởi thư viện — `html[data-palette="forest\|sunset\|mono"]`                                                                                                                                 |
| hợp chất `[data-theme="dark"][data-palette="…"]`     | override chéo trục (dark × một palette cụ thể)                                           | CSS tự viết tay: độ đặc hiệu `(0,2,0)` của nó thắng bất kỳ quy tắc `html[data-…]` đơn trục nào `(0,1,1)` bất kể thứ tự trong nguồn                                                                   |
| `voice`, `geometry`, `surface` (`style-guide.css`)   | `--f-sans`, `--radius-sm`, `--shadow-sm`, cùng một quy tắc con lồng `.x-sg-glass-target` | CSS tự viết tay: các biến ngoài `--sg-*` và các selector con lồng nhau không thể biểu diễn bằng theme override (xem [`examples/design-system/README.md`](../../../examples/design-system/README.md)) |

### Vòng lặp alias giữa các trục

Mọi trục đều áp dụng lên cùng một phần tử `html`, nên một alias ở trục này có thể nối tiếp vào một alias ở trục khác. Theme bị từ chối khi một tổ hợp gồm nhiều nhất một variant cho mỗi trục khép thành một vòng, dù từng trục riêng lẻ không có vòng:

```json
{
  "colors": { "a": "#111111", "b": "#222222" },
  "themeAxes": {
    "theme": {
      "dark": { "colors": { "a": "$b" } }
    },
    "palette": {
      "forest": { "colors": { "b": "$a" } }
    }
  }
}
```

`theme.dark` trỏ `a` vào `b` và `palette.forest` trỏ `b` vào `a`; khi cả hai cùng bật thì `a → b → a`. Lỗi nêu tên trục khai báo sau:

```text
Invalid theme (styles/theme.json):
themeAxes.palette.forest.colors.b → Alias cycle detected when themeAxes.theme.dark and themeAxes.palette.forest are active together: a → b → a — axes apply to the same element, so these aliases chain across axes; point one of them at a literal value.
```

Hãy trỏ một trong hai key vào một giá trị cố định để phá vòng lặp.

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

**Hợp đồng công khai.** Các biến mà generator phát ra (`--sg-color-<key>`, `--sg-shadow-<key>`, `--sg-radius-<key>`, `--sg-font-<key>`, `--sg-border-width-<key>`, `--sg-backdrop-blur-<key>`, `--sg-duration-<key>`, `--sg-ease-<key>`, `--sg-control-<key>`, `--sg-icon-<key>`, `--sg-opacity-<key>`, `--sg-z-<key>`, và các biến spacing nội dòng `--sg-sp-*`) là một phần của output công khai: alias phân giải về chúng, và CSS viết tay có thể đọc hoặc override chúng. Đổi tên một biến là thay đổi phá vỡ tương thích (breaking change).

## Trùng tên với utility tích hợp sẵn

Một key của theme có class trùng với một utility của Tailwind (`bg-none`, `shadow-none`, `rounded-none`, một key typography trở thành `text-sm`, `h-1` từ `h1`, hoặc `italic`, các màu có tên `transparent`/`current`/`inherit`, các màu có class `ring-`/`outline-`/`divide-` là một static của Tailwind như `solid` → `outline-solid` hoặc một độ rộng số nguyên như `3` → `ring-3`) thì không bị từ chối, nhưng quy tắc nào thắng sẽ tùy thuộc vào cách hiện thực utility đó của Tailwind. Hãy chọn một cái tên khác (`clear`, `flat`, `zero`, `heading1`); `style-gen doctor` liệt kê các xung đột mà nó nhận diện được. Key `borderWidth` chỉ gồm chữ số (`2`) lại khác: giá trị theme thay thế các class tích hợp sẵn `border-2`, `border-x-2` và `divide-x-2` của Tailwind (Tailwind tra cứu theme trước thang mặc định); `doctor` vẫn báo cáo nó để bạn xác nhận rằng việc override là có chủ đích. Các nhóm thang đo cũng xung đột theo cách đó: key `motionDuration` tên `initial` và key `motionEasing` tên `linear`, `in`, `out`, `inOut` hoặc `initial` (`ease-in`) trùng với một class Tailwind có sẵn. Key `zIndex` tên `auto` và key `zIndex` hoặc `motionDuration` chỉ gồm chữ số (`10` → `z-10`) là override, giống key `borderWidth` chỉ gồm chữ số: giá trị của theme thay cho rule của Tailwind (`z-10` → `z-index: var(--sg-z-10)`). `doctor` báo cáo từng key.
