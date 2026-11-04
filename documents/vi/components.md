<!-- source: documents/components.md sha256: 1d1707db3317 -->

# Component: các ví dụ, không phải một API

Có hai bộ component. Các ví dụ plain là phần bạn chép dùng: mỗi component một thư mục trên bộ kit `./ui` được phát hành ([UI kit](./reference/ui.md)). Harness (bộ ví dụ dùng để kiểm thử DX) là bộ kiểm thử DX của riêng repo và demo cho trang site.

## Ví dụ plain (chép dùng)

### Nơi chứa các ví dụ

`examples/plain-react` (Vite + React, Storybook, gate đối sánh), `examples/next-v4` (Next.js App Router), `examples/plain-nuxt` (Nuxt 4). Cả ba đều render cùng một landing page từ mười component giống nhau.

### Mỗi component một thư mục

```text
<app>/src/theme/theme.json        # the app's own theme (Nuxt: app/theme/theme.json)
<app>/src/theme.ts                # export { theme, tokens, cn }  (Nuxt: app/theme.ts)
<app>/src/ui/<kebab-name>/        # one folder per component (Nuxt: app/ui/<kebab-name>/)
  style.ts                        # tables + recipe; imports only "../../theme" and @duydpdev/style-generator/{ui,cva,types}
  types.ts                        # exported <Name>OwnProps/<Name>Props (React/Next: may also import "react" + "@duydpdev/style-generator/ui-react")
  <Name>.tsx | <Name>.vue         # the component
  <Name>.stories.tsx              # plain-react only
  index.ts                        # required in .tsx apps (plain-react, next-v4); absent in plain-nuxt
<app>/src/sections/*.tsx          # landing sections + page helpers (Section, Container, SectionHead); app code, not scanned by check:plain-ui (Nuxt: app/sections/*.vue)
```

- `theme.json` là cấu hình design token thu gọn của theme.
- `theme.ts` export `theme`, `tokens`, và `cn` cho ứng dụng.
- `style.ts` là cùng một file trong cả ba ứng dụng; file này chứa các bảng variant và recipe headless.
- `types.ts` giống nhau ở React và Next; `types.ts` của Vue khai báo các prop mà trình biên dịch SFC có thể đọc được và mở rộng các prop spacing bằng `/* @vue-ignore */`.
- `<Name>.tsx` / `<Name>.vue` render markup của component và áp dụng recipe cùng các utility spacing.
- `<Name>.stories.tsx` cô lập component cho Storybook trong `plain-react`.
- `index.ts` re-export component và các kiểu của nó trong các ứng dụng `.tsx` (không có trong `plain-nuxt`).
- `sections/*.tsx` chứa các section landing của ứng dụng và các helper bố cục.

### Module theme

Module theme export `theme`, `tokens` được tạo bằng `createDesignTokens()`, và helper `cn`.

<!-- embed: examples/plain-react/src/theme.ts -->

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createCn } from "@duydpdev/style-generator/ui";

import themeJson from "./theme/theme.json";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays; no options, like `styleGenVite` in vite.config.ts. */
export const tokens = createDesignTokens(themeJson).DesignTokens.Web;

/** clsx + a tailwind-merge that knows this theme's utilities. */
export const cn = createCn(tokens);
```

### Một thư mục component

<!-- embed: examples/plain-react/src/ui/button/style.ts -->

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type { ColorVariant } from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

/**
 * The intents `color` offers. `satisfies` is the DX anchor: rename or
 * remove one of these colors in theme.json and the compiler fails here.
 */
export const buttonIntents = [
  "primary",
  "secondary",
  "success",
  "danger",
] as const satisfies readonly ColorVariant<typeof theme>[];

export type ButtonIntent = (typeof buttonIntents)[number];

const BUTTON_TINTS = ["outline", "soft", "ghost", "link"] as const;

type ButtonTint = (typeof BUTTON_TINTS)[number];

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `outline-*` or `/10` classes. */
const focusRing = {
  primary: "focus-visible:outline-primary",
  secondary: "focus-visible:outline-secondary",
  success: "focus-visible:outline-success",
  danger: "focus-visible:outline-danger",
} as const satisfies Record<ButtonIntent, string>;

const tint = {
  primary: {
    outline: "border-primary text-primary hover:bg-primary/10",
    soft: "bg-primary/10 text-primary hover:bg-primary/15",
    ghost: "text-primary hover:bg-primary/10",
    link: "text-primary",
  },
  secondary: {
    outline: "border-secondary text-secondary hover:bg-secondary/10",
    soft: "bg-secondary/10 text-secondary hover:bg-secondary/15",
    ghost: "text-secondary hover:bg-secondary/10",
    link: "text-secondary",
  },
  success: {
    outline: "border-success text-success hover:bg-success/10",
    soft: "bg-success/10 text-success hover:bg-success/15",
    ghost: "text-success hover:bg-success/10",
    link: "text-success",
  },
  danger: {
    outline: "border-danger text-danger hover:bg-danger/10",
    soft: "bg-danger/10 text-danger hover:bg-danger/15",
    ghost: "text-danger hover:bg-danger/10",
    link: "text-danger",
  },
} as const satisfies Record<ButtonIntent, Record<ButtonTint, string>>;

const colors: readonly string[] = tokens.colors;
// `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
const bgStates = createVariantMapper("bg", tokens.colors, {
  states: COLOR_STATES,
});
const bg = createVariantMapper("bg", tokens.colors);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const type = createVariantMapper("", tokens.typography);

/** A filled intent: state backgrounds, `on<Intent>` text (else `text-background`), `hover:opacity-90` without an `<intent>Hover` color. */
const fill = (intent: ButtonIntent): string[] => {
  const classes = [
    pick(bgStates, intent),
    contrastText(colors, intent, "background"),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, "md")} border`,
    `cursor-pointer ${pick(type, "text16Medium")} whitespace-nowrap outline-hidden select-none`,
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      fill: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, "background")} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: focusRing,
    size: {
      sm: "h-7 px-2.5",
      md: "h-9 px-3.5",
      lg: `h-11 px-5 ${pick(type, "text32Bold")}`,
    },
  },
  compoundVariants: buttonIntents.flatMap((intent) => [
    { color: intent, variant: "fill", class: fill(intent) },
    ...BUTTON_TINTS.map((variant) => ({
      color: intent,
      variant,
      class: tint[intent][variant],
    })),
  ]),
  defaultVariants: {
    variant: "fill",
    color: buttonIntents[0],
    size: "md",
  },
} satisfies RecipeTables;

export const buttonRecipe: RecipeFn = recipeFromTables(buttonTables);
```

<!-- embed: examples/plain-react/src/ui/button/types.ts -->

```ts
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

export type ButtonOwnProps = ThemeSpacingProps<typeof tokens> & {
  readonly variant?: "fill" | "outline" | "soft" | "ghost" | "link" | undefined;
  /** One of `buttonIntents`. */
  readonly color?: ButtonIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | undefined;
  readonly prefix?: ReactNode;
  readonly suffix?: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type ButtonProps<T extends ElementType = "button"> = Polymorphic<
  T,
  ButtonOwnProps
>;
```

<!-- embed: examples/plain-react/src/ui/button/Button.tsx -->

```tsx
import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import type { ElementType, JSX } from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/** `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed. */
export function Button<T extends ElementType = "button">({
  as,
  className,
  style,
  variant,
  color,
  size,
  prefix,
  suffix,
  children,
  ...props
}: ButtonProps<T>): JSX.Element {
  const Component: ElementType = as ?? "button";
  const split = splitSpacing(props, tokens.spacingProperties);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      className={
        cn(
          buttonRecipe({ variant, color, size }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {prefix != null && <span>{prefix}</span>}
      <span>{children}</span>
      {suffix != null && <span>{suffix}</span>}
    </Component>
  );
}
```

Phần triển khai Vue trong `plain-nuxt` dùng chung `style.ts`, dùng `types.ts` tương thích với SFC, và render một single-file component:

<!-- embed: examples/plain-nuxt/app/ui/button/types.ts -->

```ts
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

/** Button props; spacing props arrive as attributes (`@vue-ignore`). */
export interface ButtonProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  variant?: "fill" | "outline" | "soft" | "ghost" | "link";
  /** One of `buttonIntents`. */
  color?: ButtonIntent;
  size?: "sm" | "md" | "lg";
}
```

<!-- embed: examples/plain-nuxt/app/ui/button/Button.vue -->

```vue
<script setup lang="ts">
import { splitSpacing } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const slots = defineSlots<{
  default?: () => unknown;
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Root attributes: defaults, the caller's attributes, then class and style.
const root = () => {
  const split = splitSpacing(attrs, tokens.spacingProperties);
  const { class: klass, style, ...rest } = split.rest;
  return {
    type: props.as === "button" ? "button" : undefined,
    ...rest,
    class: cn(
      buttonRecipe({
        variant: props.variant,
        color: props.color,
        size: props.size,
      }),
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()">
    <span v-if="slots.prefix"><slot name="prefix" /></span>
    <span><slot /></span>
    <span v-if="slots.suffix"><slot name="suffix" /></span>
  </component>
</template>
```

### Chép một component vào ứng dụng của bạn

1. Cài đặt các dependency cần thiết:

   ```bash
   yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge
   ```

   Xem mục [Cài đặt](./README.md#cài-đặt) trong README để cấu hình registry cho scope `@duydpdev` và Personal Access Token của bạn; nếu không có cấu hình scope này npmjs sẽ phân phối một bản `3.0.0` không liên quan.

2. Nối dây `theme.css` cho bundler của bạn ([React + Vite](./getting-started/react-vite.md), [Next.js](./getting-started/next.md), [Nuxt](./getting-started/nuxt-vue.md)).

3. Chép `theme.ts` và file theme JSON của bạn, một lần.

4. Chép thư mục component. Không cần làm gì thêm: một thư mục chỉ import các file của chính nó, `../../theme` và các package.

### Mười component

| Thư mục  | Component | Gate đối sánh |
| -------- | --------- | ------------- |
| `box`    | Box       | có            |
| `text`   | Text      | có            |
| `stack`  | Stack     | có            |
| `flex`   | Flex      | có            |
| `grid`   | Grid      | có            |
| `button` | Button    | có            |
| `card`   | Card      | không         |
| `badge`  | Badge     | không         |
| `input`  | Input     | không         |
| `link`   | Link      | không         |

"có" nghĩa là `yarn workspace plain-react-example test` sẽ thất bại khi các class của React plain khác với component tương ứng của harness.

### Các quy tắc

- `className`/`class` và `style` được phép dùng trên các thẻ tag.
- Một pattern có quy tắc riêng hoặc lặp lại sẽ trở thành một component có prop được định kiểu.
- Không dùng `data-part`.
- `src/**` (Nuxt `app/**`) không bao giờ import `design-system-example` hoặc `react-v4-example` (ESLint).
- Một thư mục ui chỉ import `./…`, `../../theme` và các package.

### Thêm một component plain

Thêm thư mục vào `plain-react` với một `<Name>.stories.tsx`, chép thư mục đó (không kèm story) sang `examples/next-v4/src/ui/`, chép `style.ts` sang `examples/plain-nuxt/app/ui/<folder>/` và viết `types.ts` cùng `<Name>.vue` cho nó; sau đó chạy `yarn check:plain-ui`.

### Kiểm tra

- `yarn check:plain-ui`
- `yarn workspace plain-react-example test`
- Ba script `typecheck`/`build`
- `yarn lint` (sau `yarn build:all` và cả hai lệnh `prepare:nuxt`)

## Harness (nội bộ repo)

Harness không dùng để sao chép: đây là bộ kiểm thử DX của riêng repo và demo cho trang site.

Cho đến commit `2045cce`, Dialog, Select, List, ListItem, Card, Badge, Code, Container, Input và Link từng nằm trong `packages/ui-react` và `packages/ui-vue` đằng sau một lệnh gọi `createUi(tokens, presets)`; `git show 2045cce:packages/ui-react/src/Dialog/Dialog.tsx` có thể khôi phục một component để làm điểm bắt đầu.

### Sử dụng các component

Trong React, mỗi file trong `src/ui/` export một factory (`createBox`, `createText`, …) nhận các token của ứng dụng và preset (nếu component đó có preset). `src/ui.ts` bind chúng một lần, và mã nguồn ứng dụng sẽ import các component từ đó:

<!-- embed: examples/react-v4/src/ui.ts -->

```ts
import {
  boxPreset,
  buttonPreset,
  textPreset,
  tokens,
} from "design-system-example";

import { createBox } from "./ui/Box";
import { createButton } from "./ui/Button";
import { createFlex } from "./ui/Flex";
import { createGrid } from "./ui/Grid";
import { createStack } from "./ui/Stack";
import { createText } from "./ui/Text";

/** The example's components, bound once to the design system's tokens and presets. */
export const Box = createBox(tokens, boxPreset);
export const Button = createButton(tokens, buttonPreset);
export const Flex = createFlex(tokens);
export const Grid = createGrid(tokens);
export const Stack = createStack(tokens);
export const Text = createText(tokens, textPreset);
```

Trong Vue không có bước bind: mỗi SFC tự import các recipe đã bind của `design-system-example`, và một page sẽ import trực tiếp file mà nó render (`import Button from "~/ui/Button.vue"`).

Mọi component đều chấp nhận các prop spacing của theme (`p`, `px`, `mt`, `gapX`, …). Bảng dưới đây liệt kê các prop khác của từng component; các thuộc tính riêng của phần tử được render cũng được truyền qua.

| Component | Thay thế các thẻ                                                        | Các prop chính                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Box`     | `div`, `section`, `header`, `footer`, `aside`, `main`, `nav`, `article` | `backgroundColor`, `borderColor`, `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `width`/`height` (và min/max), `innerBorder`                                       |
| `Text`    | `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                         | `type` (một key typography), `color`, `align`, `decoration`                                                                                                                       |
| `Stack`   | không có                                                                | `align`, `justify`, `wrap`, cùng các prop bố cục của `Box`; mặc định theo chiều dọc                                                                                               |
| `Flex`    | không có                                                                | `direction`, `align`, `justify`, `wrap`, cùng các prop bố cục của `Box`                                                                                                           |
| `Grid`    | không có                                                                | `columns` (số lượng, một track list CSS như `"80px 1fr 80px"`, hoặc record `{ base, md, lg }` cho một trong hai kiểu), `align`, `justify`, `flow`, cùng các prop bố cục của `Box` |
| `Button`  | `button`                                                                | `variant` (`fill`, `outline`, `soft`, `ghost`, `link`), `color`, `size`, `prefix`, `suffix`                                                                                       |

Các quy tắc cho mã nguồn ứng dụng:

- Các variant boolean được viết gọn: `<Flex wrap>`, không viết `wrap={true}`.
- Các prop spacing là các số trên thang đo spacing hoặc các object `{ base, md, lg }`: `<Box p={4} />`, `<Stack gap={{ base: 2, md: 4 }} />`.
- Mã nguồn ứng dụng không truyền `className` và không truyền `style`; thay vào đó, hãy dùng một variant hoặc một prop token để thể hiện style. Một giá trị mà không prop nào thể hiện được (một transform hoặc chiều rộng được tính toán) giữ `style` của nó đằng sau dòng `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
- Mã nguồn ứng dụng không import recipe; recipe chỉ được dùng bên trong các file component `ui/`.

ESLint thực thi hai quy tắc cuối và cấm các thẻ trong bảng trên trong các file ứng dụng, do đó một thẻ `<div>` thuần túy sẽ bị báo lỗi. Tên các component và thẻ của chúng đến từ [`examples/ui-registry.mjs`](../../examples/ui-registry.mjs).

### Bố cục theo mục đích

- **`Stack`** là luồng một cột theo chiều dọc: một section trên trang, một form, thân của một card. Giãn cách các phần tử con bằng `gap`, không dùng margin trên từng phần tử con.
- **`Flex`** là một hàng, hoặc một tập hợp xuống dòng gồm hai phần tử con trở lên. Đừng bao giờ bọc một phần tử con đơn lẻ trong `Flex` chỉ để căn chỉnh hoặc tạo khoảng cách: hãy đặt các prop đó lên chính phần tử con hoặc trên `Stack` cha. Một ngoại lệ: một `Flex` có flex item thứ hai là một pseudo-element CSS (một đường kẻ `::before`/`::after` cạnh một nhãn) được tính là có hai flex item mặc dù markup chỉ hiển thị một phần tử con; các nhãn trong `docs-onpage.tsx`, `docs-sidebar.tsx` và `sidebar-toc.tsx` của trang site hoạt động theo cách này. ESLint không thể báo cáo quy tắc này (khoảng trắng giữa các thẻ JSX được tính là một phần tử con), vì vậy việc review sẽ kiểm tra nó.
- **`Grid`** luôn có `columns`: một số lượng (`columns={3}`), một track list CSS (`columns="220px 1fr"`), hoặc một record `{ base, md, lg }` cho một trong hai kiểu (`columns={{ base: 1, md: "220px 1fr" }}`). Một `Grid` không có `columns` thực chất là một `Stack` một cột đội lốt. ESLint báo lỗi `<Grid>` không có `columns` trong `examples/react-v4/src` và trong các template của nuxt-v4; trang landing site được miễn trừ, vì các lưới của nó sử dụng CSS template ưu tiên desktop dưới các khối `@media (max-width: …)` mà prop `columns` ưu tiên mobile không thể biểu đạt.

### `as` đa hình (polymorphic)

Các component bố cục và `Text` chấp nhận `as` để chọn phần tử gốc, và các prop khác sau đó sẽ được định kiểu cho phần tử đó: `<Text as="h1" type="display56Serif">` chấp nhận các thuộc tính của `<h1>`, và `<Box as="section">` chấp nhận các thuộc tính của `<section>`. Mỗi file React định kiểu cho các prop của mình bằng `Polymorphic` từ `@duydpdev/style-generator/ui-react`; xem [`examples/react-v4/src/ui/Box.tsx`](../../examples/react-v4/src/ui/Box.tsx).

### Thêm một component

`Text` là ví dụ hoàn chỉnh. Một component mới sẽ tác động đến những vị trí sau; hãy bỏ qua những mục không áp dụng:

1. **Recipe factory** trong `examples/design-system/src/recipes/factories/<name>.ts`, được export từ `factories/index.ts` (subpath `design-system-example/recipes`).
2. **Recipe đã bind và preset** trong `examples/design-system/src/recipes/<name>.ts`, được export từ `src/index.ts`. SFC của Vue sử dụng recipe đã bind; ứng dụng React bind factory với preset.
3. **File component React** `examples/react-v4/src/ui/<Name>.tsx`: các kiểu prop riêng trên `Polymorphic` từ `@duydpdev/style-generator/ui-react`. File này phân tách các prop bằng bộ kit trong `@duydpdev/style-generator/ui`: `splitLayout` (với `BOX_VARIANT_KEYS` và `LAYOUT_SIZE_KEYS` của `src/ui/layout.ts`) cho component bố cục, `splitSpacing` cho bất kỳ component nào khác.
4. **Export** từ `examples/react-v4/src/ui/index.ts`.
5. **Bind** trong `examples/react-v4/src/ui.ts`, và trong `site/src/ui.ts` khi trang site render component đó.
6. **Vue SFC** `examples/nuxt-v4/app/ui/<Name>.vue`.
7. **Khai báo trong registry** `{ name: "<Name>", tags: [...] }` trong `examples/ui-registry.mjs`, kèm theo danh sách các thẻ chữ thường mà nó thay thế (danh sách rỗng nếu không thay thế thẻ nào); ESLint xây dựng các quy tắc cho React và Vue từ file này.
8. **Kiểm tra kiểu**: một vài dòng trong `examples/react-v4/tests/ui-types.tsx` và `examples/nuxt-v4/tests/nuxt/ui-props.vue`, bao gồm một dòng `@ts-expect-error` / `@vue-expect-error` cho một token sai.

Factory không biết giá trị theme nào:

<!-- embed: examples/design-system/src/recipes/factories/text.ts -->

```ts
import { createVariantMapper } from "@duydpdev/style-generator/cva";
import {
  recipeFromTables,
  type RecipeFn,
  type RecipeTables,
  type RecipeTokens,
} from "@duydpdev/style-generator/ui";

/** Text defaults; every field omitted → `<Text>` emits no class of its own. */
export interface TextPreset {
  readonly base?: string | undefined;
  readonly defaultType?: string | undefined;
  readonly defaultColor?: string | undefined;
}

export const textTables = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeTables => ({
  base: preset?.base ?? "",
  variants: {
    type: createVariantMapper("", t.typography),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", t.colors),
  },
});

/** Text recipe for one theme: `type`, `color`, `decoration`, `align`. */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
```

Preset chứa các giá trị của theme, và recipe đã bind áp dụng factory cho các token của design system (`textRecipe({ type, color, decoration, align })`):

<!-- embed: examples/design-system/src/recipes/text.ts -->

```ts
import type { VariantProps } from "class-variance-authority";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type Theme } from "../tokens";

import { createTextRecipe, type TextPreset } from "./factories/text";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;

/** Design-system text defaults; `<Text>` applies them when `type`/`color` are omitted. */
export const textPreset = {
  base: "wrap-anywhere whitespace-pre-wrap",
  defaultType: "text16Medium",
  defaultColor: "foreground",
} as const satisfies TextPreset & {
  readonly defaultType: TextVariant<Theme>;
  readonly defaultColor: ColorVariant<Theme>;
};

/** Props of the bound text recipe. */
export type TextRecipeProps = Readonly<{
  type?: TextVariant<Theme> | null | undefined;
  color?: ColorVariant<Theme> | null | undefined;
  decoration?: (typeof textDecoration)[number] | null | undefined;
  align?: (typeof textAlign)[number] | null | undefined;
}>;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align })`.
 * `type` is a typography utility (`text-16-medium`), `color` a `text-*` color.
 */
export const textRecipe: (props?: TextRecipeProps) => string = createTextRecipe(
  tokens,
  textPreset,
);

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
}
```

File React export một factory nhận các token của ứng dụng và preset, để trang site có thể bind cùng một file đó với theme riêng của mình:

<!-- embed: examples/react-v4/src/ui/Text.tsx -->

```tsx
import {
  createCn,
  mergeStyle,
  splitSpacing,
  type RecipeTokens,
  type ThemeSpacingProps,
} from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import {
  createTextRecipe,
  type TextPreset,
} from "design-system-example/recipes";
import type { CSSProperties, ElementType, JSX } from "react";

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: W["colors"][number] | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography/color/align/decoration from the text recipe, preset defaults, spacing props. */
export const createText = <W extends RecipeTokens>(
  tokens: W,
  preset?: TextPreset,
) => {
  const cn = createCn(tokens);
  const text = createTextRecipe(tokens, preset);
  const spacingKeys = tokens.spacingProperties;
  return function Text<T extends ElementType = "p">({
    as,
    className,
    style,
    type = preset?.defaultType,
    color = preset?.defaultColor,
    align,
    decoration,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({ type, color, align, decoration }),
            split.className,
            className,
          ) || undefined
        }
        style={mergeStyle(split.style, style)}
      />
    );
  };
};
```

SFC của Vue import recipe đã bind từ `design-system-example` và khai báo các prop của mình bằng `defineProps`:

<!-- embed: examples/nuxt-v4/app/ui/Text.vue -->

```vue
<script setup lang="ts">
import {
  cn,
  splitSpacingProps,
  textPreset,
  textRecipe,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, TextStyleProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Text: typography, color, alignment and decoration from the theme. `type`
 * and `color` default to the design-system text preset. Spacing props work
 * as in Box (declared with `@vue-ignore`, read from the attributes).
 */
export interface TextProps
  extends /* @vue-ignore */ BoxSpacingProps, TextStyleProps {
  as?: string;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), {
  as: "p",
  type: textPreset.defaultType,
  color: textPreset.defaultColor,
});
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

// Root attributes: the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  return {
    ...rest,
    class: cn(textRecipe(props), spacing.className),
    ...(spacing.className === "" ? {} : { style: spacing.style }),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
```

### Kiểm tra

Các ví dụ không có test runner. Các bước kiểm tra của chúng diễn ra lúc biên dịch và lúc lint, và tất cả đều đọc thư mục `dist/` đã được build của thư viện, vì vậy hãy chạy `yarn build:all` trước:

- `yarn workspace react-v4-example typecheck` biên dịch `src/ui/*.tsx` và `tests/ui-types.tsx`, trong đó mỗi dòng `@ts-expect-error` bắt buộc phải ứng với một lỗi kiểu thực sự.
- `yarn workspace nuxt-v4-example typecheck` (`nuxt typecheck`) biên dịch `app/ui/*.vue` và `tests/nuxt/ui-props.vue` theo cách tương tự, với `@vue-expect-error`.
- `yarn lint` áp dụng các quy tắc của registry (các thẻ bị cấm, không dùng `className`/`style`, `Grid` phải có `columns`).
- `yarn workspace site build` (lệnh này cũng build `react-v4`) và `yarn workspace nuxt-v4-example build` chứng minh các ứng dụng render thành công.

## Recipe không dùng component

Hãy sử dụng trực tiếp `@duydpdev/style-generator/recipes` khi framework của bạn không có component mẫu nào, hoặc cho markup dùng một lần: các helper đều an toàn trên trình duyệt và độc lập với framework. Xem [Recipe](./reference/recipes.md) và [CVA helper](./reference/cva.md). Cùng một bộ kit mà các component mẫu sử dụng cũng được phát hành dưới dạng [`./ui`](./reference/ui.md) (`recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle`) và [`./ui-react`](./reference/ui-react.md) (`Polymorphic`).
