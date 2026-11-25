<!-- source: documents/agent-contract.md sha256: e449a25c0477 -->

# Hợp đồng cho agent

Các quy tắc mà một agent (hoặc một người) tuân theo khi viết theme và component bằng `@duydpdev/style-generator` trong một app. Chúng đúng với **mọi** theme: không màu, kích thước hay key nào trong file này là giá trị để chép. Các key trong code bên dưới (`primary`, `background`, `text16Medium` …) thuộc về theme ví dụ; app của bạn dùng key trong theme JSON của chính nó.

`style-gen init` ghi file này vào `.claude/rules/style-generator.md`. Mọi thứ không có ở đây nằm trong [Component](./components.md) và tài liệu tham khảo [Cấu hình theme](./reference/theme.md).

## 1. Hợp đồng vai trò (hình dạng theme, không phải tên trong theme)

Đặt tên key ngữ nghĩa theo các vai trò của chính app; đặt tên màu primitive và typography theo giá trị của chúng (xem [Quy ước đặt tên](#quy-ước-đặt-tên)). Thư viện suy ra mọi type và class từ những key bạn viết; nó không bao giờ đòi một tên cụ thể.

- `colors` là bắt buộc và là **camelCase phẳng**: `brand`, `brandHover`, `surfaceRaised`. Không object lồng nhau, không `DEFAULT`, không `_`, không mở đầu bằng một chuỗi từ hai chữ hoa trở lên (`CTA`, `HTMLText`); một chữ hoa đơn hoặc chuỗi hoa ở giữa (`primaryCTA`) thì được. Schema từ chối phần còn lại.
- Một intent có thể khai báo các sibling trạng thái `<intent>Hover`, `<intent>Active` và `<intent>Selected`. `createVariantMapper("bg", tokens.colors, { states: COLOR_STATES })` (`COLOR_STATES` từ `@duydpdev/style-generator/cva`) biến `brand` thành `bg-brand hover:bg-brand-hover active:bg-brand-active aria-selected:bg-brand-selected` khi chúng tồn tại và thành `bg-brand` khi không có.
- Một intent có thể khai báo màu chữ `<intent>Foreground` (`brand` → `brandForeground`). `contrastText(tokens.colors, intent, fallback)` trả về `text-brand-foreground` khi màu đó tồn tại, nếu không thì `text-<fallback>`. `contrastText` không đọc key `on<Intent>`; `style-gen doctor` chỉ ra tên `<intent>Foreground` cần đổi sang cho từng key như vậy.
- Giá trị `"$<key>"` là alias tới một key khác **trong cùng category** (`"brandHover": "$brandActive"` trong `colors`). Không dùng trong `typography`. Đích không tồn tại và vòng lặp là lỗi schema.
- Dark mode và palette nằm trong `themeAxes.<axis>.<variant>`; một override chỉ được định nghĩa lại các key đã có trong category gốc. Kích hoạt bằng `html[data-<axis>="<variant>"]` (dùng `themeAxisAttributes` từ `@duydpdev/style-generator/recipes`). `base` là tên variant dành riêng.
- Mọi category khác (`typography`, `shadows`, `borderRadius`, `borderWidth`, `fontFamily`, `backdropBlurs`) là tùy chọn và theo cùng ngữ pháp key. Mỗi mục typography cần `fontSize`, `lineHeight` và `fontWeight` dạng số.
- Tránh key có class trùng một utility của Tailwind (`none` → `bg-none`, typography `textSm` → `text-sm`, `h1` → `h-1`). `style-gen doctor` sẽ cảnh báo; đổi tên thành `clear`, `flat`, hoặc một key typography đặt theo giá trị như `text32Bold`.
- `style-gen init` ghi một theme khởi đầu đã theo đúng [Quy ước đặt tên](#quy-ước-đặt-tên): các primitive gray, blue, red, green và amber, bộ key ngữ nghĩa cốt lõi alias tới chúng, và typography đặt theo giá trị. Key của nó là khung để bắt đầu, còn giá trị chỉ là giữ chỗ: đổi tên hoặc thêm key ngữ nghĩa theo vai trò của app và đặt lại mọi giá trị cho app này; một giá trị khởi đầu còn nguyên là bản chép, không phải một lựa chọn.

Mỗi quy tắc trên được schema của theme bắt buộc (`generate()`, `style-gen generate`, các plugin Vite/Next) hoặc được `style-gen doctor` báo. Giữ `"$schema"` trỏ tới `theme.schema.json` được sinh ra để editor kiểm tra.

**Mỗi bộ UI một theme.** Mỗi bộ UI — một app, một design canvas, một design-system artifact — có `theme.json` riêng trong repository của sản phẩm, key ngữ nghĩa đặt theo vai trò của sản phẩm đó. Design system hay canvas được dựng từ theme đó và không tự khai giá trị token nào. Không công cụ nào kiểm quy tắc này; đây là quy tắc review.

### Quy ước đặt tên

Quy ước này áp dụng cho theme mới và design canvas mới. Đừng bao giờ đổi tên một key mà app hiện có đang dùng chỉ để theo quy ước: mọi class literal dùng key cũ sẽ không còn khớp. Thư viện chấp nhận mọi key qua được schema; quy ước là khuyến nghị, không phải quy tắc của schema.

- Màu gồm hai lớp: primitive giữ mọi giá trị literal, key ngữ nghĩa trỏ tới primitive.
- Key primitive là một sắc độ kèm một bậc, hoặc `black`/`white`: nó khớp `^(?:[a-z]+(?:50|[1-9]00|950)|black|white)(?:Alpha[1-9]\d?)?$` (`blue600`, `gray50`, `white`; `gray150` thì không). Giá trị của nó là literal, không bao giờ là `$…`. Sắc độ chỉ gồm chữ thường; các bậc là 50, từ 100 đến 900 và 950, và một thang có thể bỏ trống bậc.
- Màu trong suốt là một primitive có hậu tố alpha tính theo phần trăm (1–99): `blue600Alpha10: "rgba(37, 99, 235, 0.10)"`.
- Một key màu ngữ nghĩa cũng có thể là alias `"$<primitive>/<n>"` (`<n>` là số nguyên phần trăm, 1–100): `border: "$navy700/8"` phát ra `color-mix(in srgb, var(--sg-color-navy-700) 8%, transparent)`. Đây là dạng bổ sung bên cạnh hậu tố alpha ở trên, và nó vẫn là alias của một primitive; các key alpha vẫn hợp lệ.
- Mọi key màu khác là key ngữ nghĩa. Giá trị của nó là `"$<primitive>"` trong `colors` gốc và trong mọi override `themeAxes` định nghĩa lại nó; key ngữ nghĩa không bao giờ là alias của key ngữ nghĩa khác, và override không bao giờ định nghĩa lại primitive.

Lõi ngữ nghĩa: `background`, `foreground`, `surface`, `muted`, `mutedForeground`, `border`, `focus`, `scrim`, `primary`, `primaryForeground`, `primaryHover`, `primaryActive`, `danger`, `success`, `warning`.
`muted` là một màu nền nhẹ và `mutedForeground` là màu chữ phụ trên nó (và trên `background`), giống mọi cặp `<intent>`/`<intent>Foreground`.
Key riêng của sản phẩm (`domainNutrition`) đứng cạnh chúng.

- Một key ngữ nghĩa là key trung tính (`background`, `foreground`, `surface`, `surfaceRaised`, `muted`, `mutedForeground`, `border`, `borderStrong`, `focus`, `scrim`) hoặc `<role>[Subtle][Border][Foreground][Hover|Active|Selected]`: một role lõi hoặc role sản phẩm, rồi các hậu tố theo đúng thứ tự đó, rồi tối đa một trạng thái, luôn đứng cuối. `primaryForegroundHover` là sibling hover của `primaryForeground`; `successSubtleForeground` là màu chữ trên nền `successSubtle`. Role sản phẩm là camelCase, mỗi segment một chữ hoa (`domainNutrition`, không phải `primaryCTA`). Segment đầu không phải `on`, `ok`, `bad`, `warn` hay `line`, và role nhiều segment không kết thúc bằng một hậu tố, một trạng thái, `Ink`, `Soft`, `Line`, `Ok`, `Bad` hay `Warn` (`chartLine` bị đọc là tên v1).
- `style-gen canvas check --naming` báo các tên v1 kèm tên v2 thay thế: `on<Role>` → `<role>Foreground`, `…Ink` → `…Foreground`, `…Soft` → `…Subtle`, `…Line` → `…Border`, `ok`/`bad`/`warn` → `success`/`danger`/`warning`, `line`/`lineStrong` → `border`/`borderStrong`. Khi tên mới đã tồn tại, nó báo `merge manually` thay vì đổi tên.

- Key typography có dạng `text<size><Weight>`: nó khớp `^text(\d{2,3})(Regular|Medium|Semibold|Bold)$`. Phần số là `fontSize` tính bằng px (giá trị rem tính là rem × 16) và từ phía sau là `fontWeight` 400/500/600/700. Mọi key cùng cỡ chữ có cùng `lineHeight`. Thang cỡ chữ là 12, 14, 16, 20, 24, 32, 40, 56.
- Một mục typography không bao giờ đặt `fontFamily`. Một kiểu chữ khác là class `font-<fontFamily key>` đặt cạnh class typography: `class="text-56-regular font-display"`.
- Key radius là `sm`, `md`, `lg`, `xl` và `full`. Danh sách là đóng; theme có thể khai báo bất kỳ tập con nào, và xl dành cho bề mặt lớn (khung thiết bị, sheet, panel).

<!-- prettier-ignore -->
```json
{
  "colors": {
    "blue400": "#60a5fa",
    "blue600": "#2563eb",
    "blue600Alpha10": "rgba(37, 99, 235, 0.10)",
    "primary": "$blue600",
    "primaryHover": "$blue400",
    "scrim": "$blue600Alpha10"
  },
  "themeAxes": {
    "theme": { "dark": { "colors": { "primary": "$blue400" } } }
  },
  "typography": {
    "text16Regular": { "fontSize": "16px", "lineHeight": "24px", "fontWeight": 400 },
    "text32Bold": { "fontSize": "32px", "lineHeight": "40px", "fontWeight": 700 }
  }
}
```

Component và artboard chỉ dùng key ngữ nghĩa. Mặc định mọi key màu đều có class; `coverage: { colors: { keys: "aliased" } }` trong `style-gen.config.json` (khuyến nghị) bỏ phần coverage sinh ra cho primitive, nên chỉ key ngữ nghĩa luôn được build. Chỉ thêm `resetTailwindDefaults: ["colors"]` cho app mới không dùng class palette nào của Tailwind: nó xoá palette của Tailwind, nên một `bg-red-500` đang có sẽ không còn được sinh ra.

## 2. Bố cục

```text
<theme JSON>                # the path `style-gen.config.json#theme` names (init default: src/styles/theme.json)
<theme>.tokens.ts           # written by `style-gen generate` and the bundler plugin beside the CSS (commit it); exports `tokens`
src/theme.ts                # export { theme, tokens, cn }; imports the theme JSON and the generated tokens file
src/ui/<kebab-name>/        # one folder per component, never a loose src/components/<Name>.tsx
  style.ts                  # intents, tables, recipe
  types.ts                  # <Name>OwnProps / <Name>Props
  <Name>.tsx                # the component (Vue: <Name>.vue, no index.ts)
  index.ts                  # re-exports the component and its types
```

Mọi tùy chọn của generator nằm trong `style-gen.config.json` (`theme`, `output`, `tokensOutput` và mọi tùy chọn của `generate()`); plugin chỉ nhận `root`. Chạy `style-gen generate` một lần qua trình quản lý package của dự án (`yarn style-gen generate`, `npm exec --no -- style-gen generate`) và commit file `theme.tokens.ts` mà nó ghi ra.

Import được phép bên trong `src/ui/<folder>/`:

| File                     | Được import                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `style.ts`               | `./…`, `../../theme`, `@duydpdev/style-generator/{ui,cva,types}` |
| `types.ts`, `<Name>.tsx` | các mục trên, cộng `react`, `@duydpdev/style-generator/ui-react` |
| `index.ts`               | chỉ `./…`                                                        |

## 3. Checklist cho component mới

Một component khai báo các trục áp dụng cho nó (checkbox có `color` và `size`, field không có trục nào); với ba trục này, nó chỉ dùng bộ từ vựng sau:

<!-- component-axes:start -->

| Trục      | Giá trị                                                                                                                 |
| --------- | ----------------------------------------------------------------------------------------------------------------------- |
| `color`   | một key vai trò: `primary`, `secondary`, `accent`, `danger`, `success`, `warning`, `info` hoặc một vai trò của sản phẩm |
| `variant` | `solid`, `soft`, `outline`, `ghost`, `link`                                                                             |
| `size`    | `sm`, `md`, `lg`, `icon`                                                                                                |

<!-- component-axes:end -->

- `solid` tô nền `<role>` với chữ `<role>Foreground` (chữ `background` khi theme không có `<role>Foreground`); `soft` tô nền `<role>Subtle` với chữ `<role>SubtleForeground` và mờ đi khi hover (`hover:opacity-90`); `outline` là viền và chữ `<role>` trên nền `background`, với nền hover `<role>Subtle`; `ghost` là chữ `<role>` với nền hover `<role>Subtle`; `link` là chữ `<role>`, gạch chân khi hover.
- `size` đặt chiều cao từ `controlHeight` (`h-control-<key>`) ở control một dòng (button, input, select, slider, nút của pagination), còn avatar là hình vuông cao đúng chiều cao đó; checkbox, radio và switch lấy kích thước ô từ `iconSize` (`size-icon-<key>`), còn field nhiều dòng (textarea) chỉ đổi padding và kiểu chữ. Component chỉ báo cũng chia như vậy: spinner lấy kích thước ô từ `iconSize`, còn track của progress chỉ đặt độ dày của chính nó (`h-1`/`h-2`/`h-3`). `icon` là một hình vuông cao bằng `md`; chỉ các component dạng nút khai báo nó.
- Trạng thái: hover và active lấy từ các key `<role>Hover`/`<role>Active` qua `COLOR_STATES` (thiếu chúng thì dùng `hover:opacity-90`); focus là outline `focus-visible:` (viền với field) theo key `focus`; disabled là `disabled:opacity-disabled` (token `opacity.disabled`) cùng `cursor-not-allowed`; selected là `<role>Selected` qua `COLOR_STATES` (`aria-selected:`) ở component có trạng thái chọn (một tab), và mọi component khác map vai trò đó qua `COLOR_STATES` (button solid, link) cũng mang class `aria-selected:`, class này không khớp gì cho đến khi một phần tử đặt `aria-selected="true"`; invalid là `aria-invalid:` với vai trò `danger` trên field của form.
- Các slot giải phẫu tên là `prefix`, `suffix`, `label`, `hint` và `error`; component có những slot nó cần (Button: `prefix`, `suffix`; field: `label`, `hint`, `error`). Component tự style nhiều phần tử thì đặt tên slot thêm theo phần tử đó: `root` cho phần bọc của field, `track` và `thumb` cho switch.
- Lớp phủ dùng hai key `zIndex`: `z-overlay` cho lớp nền mờ (scrim), `z-modal` cho mọi panel (dialog, drawer, popover, tooltip, menu). Các panel chung một lớp nên panel render sau nằm trên: menu mà ứng dụng render sau panel của dialog (một portal ở cuối `body`) sẽ mở phía trên nó. Panel xuất hiện bằng một transition `starting:` có thời lượng và easing từ các key `motionDuration`/`motionEasing`, và dừng dưới `motion-reduce:`; scrim tô bằng key `scrim`, hoặc bằng màu `background` ở một bậc opacity khi theme không có key đó, và làm mờ bằng một key `backdropBlurs`. Các phần mang role và class, riêng menu còn chuyển focus giữa các item đang bật (ArrowUp, ArrowDown, Home, End); mở và đóng, giữ và trả focus, `Escape`, định vị và portal thuộc về ứng dụng.

<!-- component-rules:end -->

1. Chọn các vai trò component cần và thêm các key còn thiếu vào theme JSON (kèm sibling `<intent>Hover`/`<intent>Foreground` nếu muốn, và `<intent>Subtle`/`<intent>SubtleForeground` khi component có variant `soft`).
2. Tạo `src/ui/<kebab-name>/` với `style.ts`, `types.ts`, `<Name>.tsx`, `index.ts`.
3. Trong `style.ts`, khai báo các intent dạng `as const satisfies readonly ColorVariant<typeof theme>[]`.
4. Dựng mọi class có tên một key của theme từ một mapper trên `tokens.*` (mục 4); chỉ dùng literal cho các trường hợp mục 4 cho phép, kèm một comment.
5. Export `<name>Tables` (`satisfies RecipeTables`) và `<name>Recipe = recipeFromTables(<name>Tables)`.
6. Trong `types.ts`, đặt type cho `color` là `(typeof <name>Intents)[number]` và bọc props bằng `Polymorphic`.
7. Trong `<Name>.tsx`, render `cn(<name>Recipe({ … }), className)`; `index.ts` re-export component và các type của nó.
8. Chạy `style-gen doctor` và `tsc --noEmit` qua trình quản lý package của dự án (`yarn style-gen doctor`, `npm exec --no -- style-gen doctor`); sau một bản build production, chạy `style-gen budget <css dir> --max-gzip <bytes>`.

## 4. Hợp đồng type

`theme.ts` được viết một lần. `tokens` được import từ `theme.tokens.ts` được sinh ra; plugin bundler (và `style-gen generate`) ghi lại nó sau mỗi lần sửa theme, nên nó không bao giờ lỗi thời. Đừng gọi `createDesignTokens` trong app:

<!-- embed: examples/plain-react/src/theme.ts -->

```ts
import { createCn } from "@duydpdev/style-generator/ui";

import themeJson from "./theme/theme.json";
import { tokens } from "./theme/theme.tokens";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays, generated into `./theme/theme.tokens.ts` (commit it). */
export { tokens };

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
```

- Danh sách intent dùng `ColorVariant` từ `@duydpdev/style-generator/types` với `typeof theme`. Không tự suy ra một `ColorKey` từ `tokens.colors`.
- Mọi class có tên một key của theme đến từ một mapper, mỗi category một mapper; class mang key đã **kebab-case** (`text16Medium` → `text-16-medium`):

  | Category         | Mapper                                                                   | Class                 |
  | ---------------- | ------------------------------------------------------------------------ | --------------------- |
  | `colors`         | `createVariantMapper("bg", tokens.colors)` (cả `text`, `border`, `ring`) | `bg-<key>`            |
  | `typography`     | `createVariantMapper("", tokens.typography)`                             | `<key>`               |
  | `borderRadius`   | `createVariantMapper("rounded", tokens.borderRadius)`                    | `rounded-<key>`       |
  | `fontFamily`     | `createVariantMapper("font", tokens.fontFamily)`                         | `font-<key>`          |
  | `borderWidth`    | `createVariantMapper("border", tokens.borderWidth)`                      | `border-<key>`        |
  | `shadows`        | `createVariantMapper("shadow", tokens.shadows)`                          | `shadow-<key>`        |
  | `controlHeight`  | `createVariantMapper("h-control", tokens.controlHeight)`                 | `h-control-<key>`     |
  | `iconSize`       | `createVariantMapper("size-icon", tokens.iconSize)`                      | `size-icon-<key>`     |
  | `zIndex`         | `createVariantMapper("z", tokens.zIndex)`                                | `z-<key>`             |
  | `motionDuration` | `createVariantMapper("duration", tokens.motionDuration)`                 | `duration-<key>`      |
  | `motionEasing`   | `createVariantMapper("ease", tokens.motionEasing)`                       | `ease-<key>`          |
  | `backdropBlurs`  | `createVariantMapper("backdrop-blur", tokens.backdropBlurs)`             | `backdrop-blur-<key>` |

  Đọc mapper bằng `mapper.<key>` (kiểm tra lúc compile) hoặc `pick(mapper, key)` (ném lỗi lúc import khi theme thiếu key). Không bao giờ gõ tay `rounded-pill`, `font-sans` hay một class typography.

- Generator chỉ emit một state variant trên đúng key trạng thái tương ứng (`hover:bg-<key>-hover`, `active:bg-<key>-active`, `aria-selected:bg-<key>-selected`). Mọi cặp variant và key của theme khác là một class literal mà Tailwind tìm thấy khi quét file: một variant khác (`focus-visible:outline-<key>`, `disabled:opacity-<key>`, `aria-invalid:border-<key>`), một state variant trên key không phải sibling của trạng thái đó (`hover:bg-<intent>-subtle`), một bước opacity không có trong `coverage.colors.opacities`, hoặc một trạng thái kèm opacity (`hover:bg-<key>/10`). Đặt key cho mỗi literal như vậy theo key của theme mà nó nhắc tới và kiểm tra bằng `satisfies`, để một key rời khỏi theme làm compiler báo lỗi; mỗi bảng như vậy có một comment một dòng giải thích lý do. Utility bố cục không có key của theme (`inline-flex`, `gap-1.5`, `tabular-nums`) là literal bình thường.
- Key của theme viết tay (danh sách key và class literal) nằm trong một khối mỗi `style.ts`, được kiểm tra bằng `satisfies`; một lần đọc `mapper.<key>` ở chỗ khác được compiler tự kiểm tra. Trong button ví dụ, region này là **phần duy nhất thay đổi theo theme**:

<!-- embed: examples/plain-react/src/ui/button/style.ts#button-preset -->

```ts
/**
 * The intents `color` offers. `satisfies` is the DX anchor: rename or
 * remove one of these colors in theme.json and the compiler fails here.
 * Each needs `<intent>Subtle` and `<intent>SubtleForeground` for `soft`.
 */
export const buttonIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `hover:` variant of a `Subtle` key. */
const hoverTint = {
  primary: "hover:bg-primary-subtle",
  secondary: "hover:bg-secondary-subtle",
  success: "hover:bg-success-subtle",
  danger: "hover:bg-danger-subtle",
} as const satisfies Record<ButtonIntent, string>;

/** Literal classes keyed by the theme key they name: the generator emits no `focus-visible:`/`disabled:` variant of a theme key, so Tailwind finds these by scanning this file. `satisfies` fails when a key leaves the theme. */
const stateClasses = {
  focus: { focus: "focus-visible:outline-focus" },
  disabled: { disabled: "disabled:opacity-disabled" },
} as const satisfies {
  focus: Partial<Record<ColorVariant<typeof theme>, string>>;
  disabled: Partial<Record<keyof (typeof theme)["opacity"], string>>;
};

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles, one `controlHeight` key per size. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
  height: { sm: "sm", md: "md", lg: "lg" },
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  typeLg: TextVariant<typeof theme>;
  height: Record<"sm" | "md" | "lg", keyof (typeof theme)["controlHeight"]>;
};
```

File component áp recipe qua `cn` và nhận `className` sau cùng:

<!-- embed: examples/plain-react/src/ui/badge/Badge.tsx -->

```tsx
import type { ElementType, JSX } from "react";

import { cn } from "../../theme";

import { badgeRecipe } from "./style";
import type { BadgeProps } from "./types";

/** `Badge`: a short label; `color` × `variant` from the badge recipe. */
export function Badge<T extends ElementType = "span">({
  as,
  color,
  variant,
  className,
  ...rest
}: BadgeProps<T>): JSX.Element {
  const Component: ElementType = as ?? "span";
  return (
    <Component
      {...rest}
      className={cn(badgeRecipe({ color, variant }), className) || undefined}
    />
  );
}
```

## 5. Cấm trong code của app

- Import trực tiếp `class-variance-authority`, `clsx` hoặc `tailwind-merge`. Dùng `recipeFromTables` cho recipe và `cn` từ `theme.ts` (`createCn(tokens)`) để gộp class.
- Gõ tay class Tailwind về màu, bo góc, shadow, font hay typography (`className="bg-blue-500 rounded-lg"`). Thay vào đó, thêm một variant cho component.
- Tag thô khi đã có component (`div`/`section`/… → `Box`, `span`/`p`/`h1`… → `Text`, `button` → `Button`).
- Import từ một thư mục component khác, hoặc từ ngoài `./…`, `../../theme` và các package, bên trong một thư mục ui.
- Thuộc tính `data-*` dùng làm hook CSS. Thuộc tính data duy nhất thư viện đọc là các thuộc tính `themeAxes` trên `<html>`.
- Giá trị theme (mã hex, hàm màu, kích thước pixel) trong TypeScript. Giá trị nằm trong theme JSON; code chỉ gọi tên key.
- Key chép từ một theme ví dụ. Suy ra intent từ vai trò của app bạn đang xây.
- Một namespace token thứ hai bên cạnh `--sg-*`: custom property (như `--app-ink`) chứa giá trị màu, radius, shadow, font hay cỡ chữ. Kích thước layout không thuộc category nào của theme (độ rộng sidebar) không phải token.
- `font-size` hoặc shorthand `font` viết ngoài một key typography — inline, trong CSS hay trên canvas.

## 6. Sàn giao diện (mọi theme)

Theme quyết định vẻ ngoài; các giới hạn dưới đây đúng với mọi theme và mọi variant của `themeAxes`. Mỗi giới hạn là một con số hoặc một trạng thái đo được, không phải chuyện gu thẩm mỹ.

- Chữ đạt 4.5:1 so với bề mặt nó nằm trên, 3:1 khi cỡ chữ từ 24px trở lên (hoặc khoảng 19px đậm), trong mọi variant của mọi axis (WCAG 1.4.3). Kiểm các cặp màu mà component thực sự render, không chỉ `foreground` trên `background`.
- Viền control, outline focus và icon mang nghĩa đạt 3:1 so với xung quanh (WCAG 1.4.11).
- Mọi phần tử tương tác có trạng thái focus nhìn thấy được cho người dùng bàn phím: một outline `focus-visible:` bằng màu của theme, không bao giờ chỉ `outline: none` (WCAG 2.4.7).
- Vùng bấm tối thiểu 24×24 CSS px (WCAG 2.5.8) và 44×44 trên màn hình cảm ứng. Mở rộng vùng bấm bằng padding, không phóng to icon.
- Màu sắc không bao giờ là tín hiệu duy nhất: lỗi, trạng thái hay lựa chọn đều có thêm chữ, icon hoặc hình dạng (WCAG 1.4.1).
- Chuyển động không thiết yếu dừng lại khi có `prefers-reduced-motion` (các variant `motion-reduce:`).
- Icon bên trong một component nằm trong slot icon của component đó (`prefix`/`suffix` của `Button`), không bao giờ nằm trong children cạnh nhãn và không đẩy bằng margin: slot căn giữa icon, còn dòng nhãn đặt icon lên baseline của chữ. Button chỉ có icon thì không có children và có `aria-label`; slot làm nó vuông.
- Một bộ icon, một độ dày nét và một thang cỡ được khai báo theo vai trò (ví dụ 12 cho chevron, 16 cạnh chữ, 20 cho control cảm ứng chỉ có icon, 24 cho minh hoạ). Không dùng emoji hay ký tự hình thay cho icon.

## 7. Thêm

Quy tắc nào được công cụ kiểm tra, và ở đâu:

| Mức      | Nội dung                                                                                                                                         | Chạy ở đâu                                     |
| :------- | :----------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| Bắt buộc | Schema của theme: tên key, alias, override `themeAxes`, xung đột                                                                                 | Mọi `generate()`, `style-gen generate`, plugin |
| Tự chọn  | `style-gen canvas check`: một theme cho mỗi canvas, cùng `--naming`, `--boards` (kèm `--recipes <file>`), `--stamp`, `--intents`, `--ds-version` | Chỉ khi được gọi (một script, CI)              |
| Quy ước  | Mọi thứ khác trong hợp đồng này (layout, checklist component, code bị cấm trong app, mức sàn giao diện)                                          | Review                                         |

[Component](./components.md) chứa các component ví dụ, harness và các recipe factory; [UI kit](./reference/ui.md) mô tả `recipeFromTables`, `pick`, `contrastText`, `createCn` và các helper spacing.
