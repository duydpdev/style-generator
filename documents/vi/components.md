<!-- source: documents/components.md sha256: b5c8a462dba0 -->

# Component: các ví dụ, không phải một API

Có hai bộ component. Các ví dụ plain là phần bạn chép dùng: mỗi component một thư mục trên bộ kit `./ui` được phát hành ([UI kit](./reference/ui.md)). Harness (bộ ví dụ dùng để kiểm thử DX) là bộ kiểm thử DX của riêng repo và demo cho trang site.

## Ví dụ plain (chép dùng)

### Nơi chứa các ví dụ

`examples/plain-react` (Vite + React, Storybook, gate đối sánh) và `examples/plain-nuxt` (Nuxt 4, Storybook). Cả hai đều render cùng một landing page từ mười component giống nhau, và mỗi thư mục component có một story (hãy thêm một story với mỗi component mới, trong cả hai ứng dụng plain).

### Mỗi component một thư mục

```text
<app>/src/theme/theme.json        # the app's own theme (Nuxt: app/theme/theme.json)
<app>/src/options.ts              # export { options }: generator options, imports no JSON  (Nuxt: app/options.ts)
<app>/src/theme.ts                # export { theme, tokens, cn }  (Nuxt: app/theme.ts)
<app>/src/ui/<kebab-name>/        # one folder per component (Nuxt: app/ui/<kebab-name>/)
  style.ts                        # tables + recipe; imports only "../../theme" and @duydpdev/style-generator/{ui,cva,types}
  types.ts                        # exported <Name>OwnProps/<Name>Props (React: may also import "react" + "@duydpdev/style-generator/ui-react")
  <Name>.tsx | <Name>.vue         # the component
  <Name>.stories.tsx              # plain-react; <Name>.stories.ts in plain-nuxt
  index.ts                        # required in plain-react; absent in plain-nuxt
<app>/src/sections/*.tsx          # landing sections + page helpers (Section, Container, SectionHead); app code, not scanned by check:plain-ui (Nuxt: app/sections/*.vue)
```

- `theme.json` là cấu hình design token thu gọn của theme.
- `options.ts` giữ literal `options` (ở đây là `coverage.colors.opacities`). File này không import JSON, nên config của bundler (`vite.config.ts`, `next.config.ts`, `nuxt.config.ts`) import nó mà không làm dev server khởi động lại ở mỗi lần sửa theme; `theme.ts` truyền nó cho `createDesignTokens` và `style-gen.config.json` lặp lại nó cho CLI (`check:plain-ui` giữ hai bản bằng nhau).
- `theme.ts` export `theme`, `tokens`, và `cn` cho ứng dụng.
- `style.ts` là cùng một file trong cả hai ứng dụng; file này chứa các bảng variant và recipe headless.
- `types.ts` phụ thuộc framework (không được so sánh); `types.ts` của Vue khai báo các prop mà trình biên dịch SFC có thể đọc được và mở rộng các prop spacing bằng `/* @vue-ignore */`.
- `<Name>.tsx` / `<Name>.vue` render markup của component và áp dụng recipe cùng các utility spacing.
- `<Name>.stories.tsx` (`<Name>.stories.ts` trong `plain-nuxt`) cô lập component cho Storybook; `plain-nuxt` dùng các bản port Vue viết tay của story `plain-react`. Chỉ các thư mục component có story: mỗi `.storybook/main.ts` chỉ nạp `ui/**`, nên các section, `App` và `ThemeSwitch` không có story.
- `index.ts` re-export component và các kiểu của nó trong các ứng dụng `.tsx` (không có trong `plain-nuxt`).
- `sections/*.tsx` chứa các section landing của ứng dụng và các helper bố cục.

### Module theme

Module theme export `theme`, `tokens` được tạo bằng `createDesignTokens(theme, options)` (`options` lấy từ `options.ts`), và helper `cn`.

<!-- embed: examples/plain-react/src/theme.ts -->

```ts
import { createDesignTokens } from "@duydpdev/style-generator/tokens";
import { createCn } from "@duydpdev/style-generator/ui";

import { options } from "./options";
import themeJson from "./theme/theme.json";

/** The theme; `typeof theme` feeds `ColorVariant<typeof theme>` in the ui folders. */
export const theme = themeJson;

/** Typed token arrays from the theme and `options` (`./options`, shared with the bundler config). */
export const tokens = createDesignTokens(themeJson, options).DesignTokens.Web;

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
      lg: `h-11 px-5 ${pick(type, "text20Semibold")}`,
    },
    // Set by the components when there is no label and exactly one icon slot.
    iconOnly: { true: "aspect-square px-0" },
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
import type { ElementType, JSX, ReactNode } from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/**
 * An icon slot is a flex box so an inline-level icon (an inline-block wrapper,
 * `<iconify-icon>`) is centred instead of sitting on the 24px line box's baseline.
 * `empty:hidden` drops a slot whose content rendered nothing, so it takes no `gap`.
 */
const ICON_SLOT = "flex shrink-0 items-center empty:hidden";

/** Content React renders: not `null`/`undefined`, a boolean (`{open && "Label"}`) or `""`. */
const present = (node: ReactNode): boolean =>
  node != null && typeof node !== "boolean" && node !== "";

/**
 * `Button`: variant × intent × size; a `<button>` gets `type="button"` unless one is passed.
 * An icon-only button passes the icon as `prefix` (or `suffix`) with no label and an `aria-label`:
 * no label span is rendered, so `gap` cannot push the icon off centre, and the button is square.
 */
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
  const iconOnly = !present(children) && present(prefix) !== present(suffix);
  return (
    <Component
      type={Component === "button" ? "button" : undefined}
      {...split.rest}
      className={
        cn(
          buttonRecipe({ variant, color, size, iconOnly }),
          split.className,
          className,
        ) || undefined
      }
      style={mergeStyle(split.style, style)}
    >
      {present(prefix) && <span className={ICON_SLOT}>{prefix}</span>}
      {present(children) && <span className="empty:hidden">{children}</span>}
      {present(suffix) && <span className={ICON_SLOT}>{suffix}</span>}
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
import { Comment, Fragment, Text, useAttrs, type VNode } from "vue";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const slots = defineSlots<{
  default?: () => VNode[];
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Whether slot output (vnodes, a fragment's children or one entry) renders
// something. Comments (`v-if`), blank text, empty fragments and the raw
// `null`/boolean entries a render function can leave in a fragment do not.
const filled = (nodes: unknown): boolean => {
  if (Array.isArray(nodes)) return nodes.some(filled);
  if (nodes == null || typeof nodes === "boolean") return false;
  if (typeof nodes === "string") return nodes.trim() !== "";
  if (typeof nodes !== "object") return true;
  const node = nodes as VNode;
  if (node.type === Comment) return false;
  if (node.type === Fragment || node.type === Text)
    return filled(node.children);
  return true;
};

// Runs the default slot only to create its vnodes (nothing mounts), so a
// `v-if`-false or blank label counts as no label.
const hasLabel = (): boolean => filled(slots.default?.());
const hasPrefix = (): boolean => filled(slots.prefix?.());
const hasSuffix = (): boolean => filled(slots.suffix?.());

// Root attributes: defaults, the caller's attributes, then class and style.
const root = () => {
  const iconOnly = !hasLabel() && hasPrefix() !== hasSuffix();
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
        iconOnly,
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
    <!-- Icon slots are flex boxes so an inline-level icon is centred, not baseline-aligned. -->
    <!-- A slot span renders only when its content does, so the DOM matches `iconOnly`; an empty span would still take a `gap` and push the icon off centre. -->
    <!-- `empty:hidden` is the net for a child component that renders nothing, which the vnode check counts as content. -->
    <span v-if="hasPrefix()" class="flex shrink-0 items-center empty:hidden"
      ><slot name="prefix"
    /></span>
    <span v-if="hasLabel()" class="empty:hidden"><slot /></span>
    <span v-if="hasSuffix()" class="flex shrink-0 items-center empty:hidden"
      ><slot name="suffix"
    /></span>
  </component>
</template>
```

### Chép một component vào ứng dụng của bạn

1. Cài đặt các dependency cần thiết:

   ```bash
   yarn add @duydpdev/style-generator@^7.0.0 class-variance-authority clsx tailwind-merge
   ```

   Xem mục [Cài đặt](./README.md#cài-đặt) trong README để cấu hình registry cho scope `@duydpdev` và Personal Access Token của bạn; nếu không có cấu hình scope này npmjs sẽ phân phối một bản `3.0.0` không liên quan.

2. Nối dây `theme.css` cho bundler của bạn ([React + Vite](./getting-started/react-vite.md), [Next.js](./getting-started/next.md), [Nuxt](./getting-started/nuxt-vue.md)).

3. Chép `theme.ts`, `options.ts` và file theme JSON của bạn, một lần.

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
- Không dùng thuộc tính `data-*` làm hook CSS riêng (ESLint và job `check` của CI cấm thuộc tính part-hook cũ toàn repo); các hook CSS riêng trong các app plain là `className` thông thường.
- `src/**` (Nuxt `app/**`) không bao giờ import `design-system-example` hoặc `harness-example` (ESLint).
- Một thư mục ui chỉ import `./…`, `../../theme` và các package.

### Thêm một component plain

Thêm thư mục vào `plain-react` với một `<Name>.stories.tsx`, chép `style.ts` sang `examples/plain-nuxt/app/ui/<folder>/` và viết `types.ts`, `<Name>.vue` cùng một bản port `<Name>.stories.ts` cho nó; sau đó chạy `yarn check:plain-ui`.

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

<!-- embed: examples/harness/src/ui.ts -->

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

Trong Vue (`plain-nuxt`) không có bước bind: mỗi SFC tự import `cn` và `tokens` từ `theme.ts` của ứng dụng và recipe từ `style.ts` của chính nó, và một page sẽ import trực tiếp file mà nó render (`import Button from "~/ui/button/Button.vue"`).

Mọi component đều chấp nhận các prop spacing của theme (`p`, `px`, `mt`, `gapX`, …). Bảng dưới đây liệt kê các prop khác của từng component; các thuộc tính riêng của phần tử được render cũng được truyền qua.

| Component | Thay thế các thẻ                                                        | Các prop chính                                                                                                                                                                                                                                                                                                                             |
| --------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Box`     | `div`, `section`, `header`, `footer`, `aside`, `main`, `nav`, `article` | `backgroundColor`, `borderColor`, `ringColor`, `outlineColor` (một token hoặc `token/step`), `border*`, `rounded*`, `shadow`, `backdropBlur`, `position`, `display`, `overflow`, `zIndex`, `opacity`, `cursor`, `pointerEvents`, `select`, `transition`, `aspect`, `objectFit`, `visibility`, `width`/`height` (và min/max), `innerBorder` |
| `Text`    | `span`, `p`, `h1`, `h2`, `h3`, `h4`, `h5`, `h6`                         | `type` (một key typography), `color` (một token hoặc `token/step`), `align`, `decoration`, `transform`, `italic`, `truncate`, `lineClamp`, `wrap`                                                                                                                                                                                          |
| `Stack`   | không có                                                                | `align`, `justify`, `wrap`, `divideColor`, cùng các prop bố cục của `Box`; mặc định theo chiều dọc                                                                                                                                                                                                                                         |
| `Flex`    | không có                                                                | `direction`, `align`, `justify`, `wrap`, `divideColor`, `grow`, `shrink`, `basis`, cùng các prop bố cục của `Box`                                                                                                                                                                                                                          |
| `Grid`    | không có                                                                | `columns` (số lượng, một track list CSS như `"80px 1fr 80px"`, hoặc record `{ base, md, lg }` cho một trong hai kiểu), `align`, `justify`, `flow`, `rows` (`1`-`6` hoặc `"none"`; với `as="textarea"` đây là prop của grid, không phải thuộc tính HTML), cùng các prop bố cục của `Box`                                                    |
| `Button`  | `button`                                                                | `variant` (`fill`, `outline`, `soft`, `ghost`, `link`), `color`, `size`, `prefix`, `suffix`                                                                                                                                                                                                                                                |

Mỗi prop bố cục tĩnh nhận hậu tố class của Tailwind viết theo camelCase (`display="inlineFlex"` → `inline-flex`, `cursor="notAllowed"` → `cursor-not-allowed`); `zIndex` (`0`-`50` theo bước 10, `"auto"`) và `opacity` (`0`-`100` theo bước 10) nhận số; các bước màu là `coverage.colors.opacities`; `Input` thuần cũng nhận `placeholderColor` (mặc định `muted`).

Các màu `token/step` của `Text` (`color="primary/50"`) là các bước trong `coverage.colors.opacities`, mà các ứng dụng ví dụ khai báo trong `options.ts` và `style-gen.config.json`. `truncate` cũng đặt `whitespace-nowrap`, nên đừng kết hợp nó với `lineClamp`.

Các quy tắc cho mã nguồn ứng dụng:

- Các variant boolean được viết gọn: `<Flex wrap>`, không viết `wrap={true}`. `false` chỉ được viết khi nó chọn một class: `<Flex shrink={false}>` render ra `shrink-0`.
- Các prop spacing là các số trên thang đo spacing hoặc các object `{ base, md, lg }`: `<Box p={4} />`, `<Stack gap={{ base: 2, md: 4 }} />`.
- Mã nguồn ứng dụng không truyền `className` và không truyền `style`; thay vào đó, hãy dùng một variant hoặc một prop token để thể hiện style. Một giá trị mà không prop nào thể hiện được (một transform hoặc chiều rộng được tính toán) giữ `style` của nó đằng sau dòng `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
- Mã nguồn ứng dụng không import recipe; recipe chỉ được dùng bên trong các file component `ui/`.

ESLint thực thi hai quy tắc cuối và cấm các thẻ trong bảng trên trong các file ứng dụng, do đó một thẻ `<div>` thuần túy sẽ bị báo lỗi. Tên các component và thẻ của chúng đến từ [`examples/ui-registry.mjs`](../../examples/ui-registry.mjs).

### Bố cục theo mục đích

- **`Stack`** là luồng một cột theo chiều dọc: một section trên trang, một form, thân của một card. Giãn cách các phần tử con bằng `gap`, không dùng margin trên từng phần tử con.
- **`Flex`** là một hàng, hoặc một tập hợp xuống dòng gồm hai phần tử con trở lên. Đừng bao giờ bọc một phần tử con đơn lẻ trong `Flex` chỉ để căn chỉnh hoặc tạo khoảng cách: hãy đặt các prop đó lên chính phần tử con hoặc trên `Stack` cha. Một ngoại lệ: một `Flex` có flex item thứ hai là một pseudo-element CSS (một đường kẻ `::before`/`::after` cạnh một nhãn) được tính là có hai flex item mặc dù markup chỉ hiển thị một phần tử con; các nhãn trong `docs-onpage.tsx`, `docs-sidebar.tsx` và `sidebar-toc.tsx` của trang site hoạt động theo cách này. ESLint không thể báo cáo quy tắc này (khoảng trắng giữa các thẻ JSX được tính là một phần tử con), vì vậy việc review sẽ kiểm tra nó.
- **`Grid`** luôn có `columns`: một số lượng (`columns={3}`), một track list CSS (`columns="220px 1fr"`), hoặc một record `{ base, md, lg }` cho một trong hai kiểu (`columns={{ base: 1, md: "220px 1fr" }}`). Một `Grid` không có `columns` thực chất là một `Stack` một cột đội lốt. ESLint báo lỗi `<Grid>` không có `columns` trong `examples/harness/src`; trang landing site được miễn trừ, vì các lưới của nó sử dụng CSS template ưu tiên desktop dưới các khối `@media (max-width: …)` mà prop `columns` ưu tiên mobile không thể biểu đạt.

### `as` đa hình (polymorphic)

Các component bố cục và `Text` chấp nhận `as` để chọn phần tử gốc, và các prop khác sau đó sẽ được định kiểu cho phần tử đó: `<Text as="h1" type="display56Serif">` chấp nhận các thuộc tính của `<h1>`, và `<Box as="section">` chấp nhận các thuộc tính của `<section>`. Mỗi file React định kiểu cho các prop của mình bằng `Polymorphic` từ `@duydpdev/style-generator/ui-react`; xem [`examples/harness/src/ui/Box.tsx`](../../examples/harness/src/ui/Box.tsx).

### Thêm một component

`Text` là ví dụ hoàn chỉnh. Một component mới sẽ tác động đến những vị trí sau; hãy bỏ qua những mục không áp dụng:

1. **Recipe factory** trong `examples/design-system/src/recipes/factories/<name>.ts`, được export từ `factories/index.ts` (subpath `design-system-example/recipes`).
2. **Recipe đã bind và preset** trong `examples/design-system/src/recipes/<name>.ts`, được export từ `src/index.ts`. Ứng dụng React bind factory với preset.
3. **File component React** `examples/harness/src/ui/<Name>.tsx`: các kiểu prop riêng trên `Polymorphic` từ `@duydpdev/style-generator/ui-react`. File này phân tách các prop bằng bộ kit trong `@duydpdev/style-generator/ui`: `splitLayout` (với `BOX_VARIANT_KEYS` và `LAYOUT_SIZE_KEYS` của `src/ui/layout.ts`) cho component bố cục, `splitSpacing` cho bất kỳ component nào khác.
4. **Export** từ `examples/harness/src/ui/index.ts`.
5. **Bind** trong `examples/harness/src/ui.ts`, và trong `site/src/ui.ts` khi trang site render component đó.
6. **Khai báo trong registry** `{ name: "<Name>", tags: [...] }` trong `examples/ui-registry.mjs`, kèm theo danh sách các thẻ chữ thường mà nó thay thế (danh sách rỗng nếu không thay thế thẻ nào); ESLint xây dựng các quy tắc cho React từ file này.
7. **Kiểm tra kiểu**: một vài dòng trong `examples/harness/tests/ui-types.tsx`, bao gồm một dòng `@ts-expect-error` cho một token sai.

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
    color: createVariantMapper("text", t.colors, {
      opacities: t.opacities ?? [],
    }),
    transform: {
      uppercase: "uppercase",
      lowercase: "lowercase",
      capitalize: "capitalize",
      normalCase: "normal-case",
    },
    italic: { true: "italic" },
    truncate: { true: "truncate whitespace-nowrap" },
    lineClamp: {
      1: "line-clamp-1",
      2: "line-clamp-2",
      3: "line-clamp-3",
      4: "line-clamp-4",
      5: "line-clamp-5",
      6: "line-clamp-6",
      none: "line-clamp-none",
    },
    wrap: {
      wrap: "text-wrap",
      nowrap: "text-nowrap whitespace-nowrap",
      balance: "text-balance",
      pretty: "text-pretty",
    },
  },
});

/**
 * Text recipe for one theme: `type`, `color` (a token or `token/step`),
 * `decoration`, `align`, `transform`, `italic`, `truncate` (also sets
 * `whitespace-nowrap`), `lineClamp` and `wrap`.
 */
export const createTextRecipe = (
  t: RecipeTokens,
  preset?: TextPreset,
): RecipeFn => recipeFromTables(textTables(t, preset));
```

Preset chứa các giá trị của theme, và recipe đã bind áp dụng factory cho các token của design system (`textRecipe({ type, color, decoration, align, transform, italic, truncate, lineClamp, wrap })`):

<!-- embed: examples/design-system/src/recipes/text.ts -->

```ts
import type { VariantProps } from "class-variance-authority";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { tokens, type ColorValue, type Theme } from "../tokens";

import { createTextRecipe, type TextPreset } from "./factories/text";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;
export const textTransform = [
  "uppercase",
  "lowercase",
  "capitalize",
  "normalCase",
] as const;
export const textLineClamp = [1, 2, 3, 4, 5, 6, "none"] as const;
export const textWrap = ["wrap", "nowrap", "balance", "pretty"] as const;

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
  color?: ColorValue | null | undefined;
  decoration?: (typeof textDecoration)[number] | null | undefined;
  align?: (typeof textAlign)[number] | null | undefined;
  transform?: (typeof textTransform)[number] | null | undefined;
  italic?: boolean | null | undefined;
  truncate?: boolean | null | undefined;
  lineClamp?: (typeof textLineClamp)[number] | null | undefined;
  wrap?: (typeof textWrap)[number] | null | undefined;
}>;

/**
 * Headless text recipe: `textRecipe({ type, color, decoration, align,
 * transform, italic, truncate, lineClamp, wrap })`. `type` is a typography
 * utility (`text-16-medium`), `color` a `text-*` color or `token/step`
 * (`primary/50`); `truncate` also sets `whitespace-nowrap` (do not combine
 * it with `lineClamp`).
 */
export const textRecipe: (props?: TextRecipeProps) => string = createTextRecipe(
  tokens,
  textPreset,
);

export type TextVariants = VariantProps<typeof textRecipe>;

/** Props a framework `Text` component adds on top of the element's own props. */
export interface TextStyleProps {
  type?: TextVariant<Theme>;
  color?: ColorValue;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  transform?: (typeof textTransform)[number];
  italic?: boolean;
  truncate?: boolean;
  lineClamp?: (typeof textLineClamp)[number];
  wrap?: (typeof textWrap)[number];
}
```

File React export một factory nhận các token của ứng dụng và preset, để trang site có thể bind cùng một file đó với theme riêng của mình:

<!-- embed: examples/harness/src/ui/Text.tsx -->

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

import type { ColorValue } from "./layout";

type TextOwnProps<W extends RecipeTokens> = ThemeSpacingProps<W> & {
  readonly type?: W["typography"][number] | undefined;
  readonly color?: ColorValue<W> | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly transform?:
    | "uppercase"
    | "lowercase"
    | "capitalize"
    | "normalCase"
    | undefined;
  readonly italic?: boolean | undefined;
  readonly truncate?: boolean | undefined;
  readonly lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none" | undefined;
  readonly wrap?: "wrap" | "nowrap" | "balance" | "pretty" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

/** `Text`: typography, color (a token or `token/step`), align, decoration, transform, italic, truncate, line clamp, wrap from the text recipe, preset defaults, spacing props. */
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
    transform,
    italic,
    truncate,
    lineClamp,
    wrap,
    ...props
  }: Polymorphic<T, TextOwnProps<W>>): JSX.Element {
    const Component: ElementType = as ?? "p";
    const split = splitSpacing(props, spacingKeys);
    return (
      <Component
        {...split.rest}
        className={
          cn(
            text({
              type,
              color,
              align,
              decoration,
              transform,
              italic,
              truncate,
              lineClamp,
              wrap,
            }),
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

SFC của Vue trong `plain-nuxt` import `cn` và `tokens` từ `theme.ts` của ứng dụng và recipe từ `style.ts`, và khai báo các prop của mình bằng `defineProps`:

<!-- embed: examples/plain-nuxt/app/ui/text/Text.vue -->

```vue
<script setup lang="ts">
import { splitSpacing } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import { textRecipe } from "./style";
import type { TextProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), { as: "p" });
const attrs = useAttrs();

const root = () => {
  const split = splitSpacing(attrs, tokens.spacingProperties);
  const { class: klass, style, ...rest } = split.rest;
  return {
    ...rest,
    class: cn(
      textRecipe({
        type: props.type,
        color: props.color,
        align: props.align,
        decoration: props.decoration,
        transform: props.transform,
        italic: props.italic,
        truncate: props.truncate,
        lineClamp: props.lineClamp,
        wrap: props.wrap,
      }),
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
```

### Kiểm tra

Các ví dụ không có test runner. Các bước kiểm tra của chúng diễn ra lúc biên dịch và lúc lint, và tất cả đều đọc thư mục `dist/` đã được build của thư viện, vì vậy hãy chạy `yarn build:all` trước:

- `yarn workspace harness-example typecheck` biên dịch `src/ui/*.tsx` và `tests/ui-types.tsx`, trong đó mỗi dòng `@ts-expect-error` bắt buộc phải ứng với một lỗi kiểu thực sự.
- `yarn lint` áp dụng các quy tắc của registry (các thẻ bị cấm, không dùng `className`/`style`, `Grid` phải có `columns`).
- `yarn workspace site build` (lệnh này cũng build `harness`) chứng minh ứng dụng render thành công.

## Recipe không dùng component

Hãy sử dụng trực tiếp `@duydpdev/style-generator/recipes` khi framework của bạn không có component mẫu nào, hoặc cho markup dùng một lần: các helper đều an toàn trên trình duyệt và độc lập với framework. Xem [Recipe](./reference/recipes.md) và [CVA helper](./reference/cva.md). Cùng một bộ kit mà các component mẫu sử dụng cũng được phát hành dưới dạng [`./ui`](./reference/ui.md) (`recipeFromTables`, `createCn`, `splitLayout`, `mergeStyle`) và [`./ui-react`](./reference/ui-react.md) (`Polymorphic`).
