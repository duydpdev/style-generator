<!-- source: documents/getting-started/nuxt-vue.md sha256: 3fde99dba84a -->

# Bắt đầu: Nuxt + Vue

Hướng dẫn này nối `@duydpdev/style-generator` vào một ứng dụng Nuxt 4 và render một `Button` có theme, dựng từ một component Vue chép dùng được. Mọi khối mã bên dưới, trừ `app/app.vue` ở cuối, đều được chép từ [`examples/plain-nuxt`](../../../examples/plain-nuxt/README.md), thư mục này được build và kiểm tra kiểu trong CI; các section landing page của ví dụ (`Hero`, `Features`, ...) không thuộc hướng dẫn này.

## Cài đặt

Bắt đầu từ một ứng dụng Nuxt 4 (`npx nuxi@latest init my-app --template minimal`, rồi `yarn install`). Cài package và các peer dependency của nó như mô tả trong [Cài đặt](../README.md#cài-đặt). Các component còn cần `class-variance-authority`, `clsx` và `tailwind-merge`; phần thiết lập Vite bên dưới import `@tailwindcss/vite`, và package cần `tailwindcss` (template minimal không có cái nào):

```bash
yarn add @duydpdev/style-generator@^8.0.0 class-variance-authority clsx tailwind-merge tailwindcss @tailwindcss/vite
yarn add -D typescript@^5.9.0
```

`typescript` là development dependency của ứng dụng vì `@vue/compiler-sfc` đọc kiểu props từ `types.ts` qua TypeScript compiler API. Dùng 5.x hoặc 6.x trong ứng dụng Vue hoặc Nuxt (peer range của chính package là `^5.0.0 || ^6.0.0 || ^7.0.0`, cho phép các ứng dụng không biên dịch Vue SFC kiểm tra kiểu với các khai báo của package trên TypeScript 7): TypeScript 7 không cung cấp API đó, và trang sẽ thất bại với `No fs option provided to compileScript` ([Khắc phục sự cố](../troubleshooting.md#no-fs-option-provided-to-compilescript)).

## Tạo theme

Tạo `app/theme/theme.json`. `Button` bên dưới đọc các màu `primary`, `secondary`, `success`, `danger`, `background` và `foreground`, bo góc `md` cùng các kiểu chữ `text16Medium` và `text20Semibold`, nên hãy bắt đầu từ theme đầy đủ này (chính là `examples/plain-nuxt/app/theme/theme.json`):

<!-- embed: examples/plain-nuxt/app/theme/theme.json -->

```json
{
  "colors": {
    "primary": "#2647D9",
    "primaryHover": "#1F3BB8",
    "primaryActive": "#19319A",
    "onPrimary": "$surface",
    "secondary": "#6E5BFF",
    "accent": "$secondary",
    "success": "#2E7D5B",
    "danger": "#C8462C",
    "background": "#FAF7F2",
    "surface": "#FFFFFF",
    "foreground": "#0F1530",
    "muted": "#6B6D7A",
    "line": "color-mix(in srgb, var(--sg-color-foreground) 8%, transparent)"
  },
  "typography": {
    "text12Mono": {
      "fontSize": "12px",
      "fontWeight": 400,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text14Regular": {
      "fontSize": "14px",
      "fontWeight": 400,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text16Medium": {
      "fontSize": "16px",
      "fontWeight": 500,
      "lineHeight": "150%",
      "letterSpacing": "0px"
    },
    "text20Semibold": {
      "fontSize": "20px",
      "fontWeight": 600,
      "lineHeight": "140%",
      "letterSpacing": "-0.01em"
    },
    "text32Bold": {
      "fontSize": "32px",
      "fontWeight": 700,
      "lineHeight": "120%",
      "letterSpacing": "-0.02em"
    },
    "display56Serif": {
      "fontSize": "56px",
      "fontWeight": 400,
      "lineHeight": "100%",
      "letterSpacing": "-0.025em"
    }
  },
  "shadows": {
    "sm": "0px 1px 2px rgba(15, 21, 48, 0.06), 0px 1px 1px rgba(15, 21, 48, 0.04)",
    "md": "0px 8px 24px -8px rgba(15, 21, 48, 0.12), 0px 2px 6px rgba(15, 21, 48, 0.05)",
    "lg": "0px 20px 48px -16px rgba(15, 21, 48, 0.18), 0px 4px 12px rgba(15, 21, 48, 0.06)"
  },
  "backdropBlurs": {
    "sm": "4px",
    "md": "8px",
    "lg": "14px"
  },
  "borderRadius": {
    "sm": "6px",
    "md": "10px",
    "lg": "16px",
    "pill": "999px"
  },
  "fontFamily": {
    "sans": "\"Geist\", ui-sans-serif, system-ui, -apple-system, sans-serif",
    "serif": "\"Instrument Serif\", \"Geist\", serif",
    "mono": "\"JetBrains Mono\", ui-monospace, \"SFMono-Regular\", monospace"
  },
  "borderWidth": {
    "thin": "1px",
    "thick": "2px"
  },
  "themeAxes": {
    "theme": {
      "dark": {
        "colors": {
          "primary": "#8FA6FF",
          "primaryHover": "#A9BBFF",
          "primaryActive": "#C2CEFF",
          "secondary": "#A89AFF",
          "success": "#6BBF93",
          "danger": "#F08369",
          "background": "#0B0E1D",
          "surface": "#161A2D",
          "foreground": "#F2EFE9",
          "muted": "#8A8FA8"
        },
        "shadows": {
          "sm": "0px 1px 2px rgba(0, 0, 0, 0.4)",
          "md": "0px 8px 24px -8px rgba(0, 0, 0, 0.5), 0px 2px 6px rgba(0, 0, 0, 0.3)",
          "lg": "0px 20px 48px -16px rgba(0, 0, 0, 0.6)"
        }
      }
    }
  }
}
```

`yarn style-gen init` ([Bắt đầu nhanh](../README.md#bắt-đầu-nhanh)) ghi theme khởi đầu riêng của nó vào `app/assets/css/theme.json` (cùng một `theme.schema.json` bên cạnh) và một `style-gen.config.json` trỏ tới đó. Hướng dẫn này giữ theme trong `app/theme/`: hoặc bỏ qua `init`, hoặc xóa hai file đó mà nó đã ghi và thay `style-gen.config.json` bằng file hiển thị bên dưới.

## Tự quản lý theme

`app/theme.ts` biến JSON thành kiểu `theme` và helper `cn`, đồng thời re-export `tokens` có kiểu mà plugin ghi vào `app/theme/theme.tokens.ts` (hãy commit file đó; `style-gen generate --check` thất bại trong CI khi nó lỗi thời):

<!-- embed: examples/plain-nuxt/app/theme.ts -->

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

## Sinh theme.css bằng plugin Vite

Nuxt chạy trên Vite, nên `styleGenVite` nằm dưới `vite.plugins`. Nuxt 4 đặt root của Vite là `app/`, vì vậy plugin nhận thư mục dự án làm `root` và đọc `style-gen.config.json` từ đó; nó không nhận tùy chọn nào khác, nên CLI và bundler dùng chung một cấu hình:

<!-- embed: examples/plain-nuxt/nuxt.config.ts#nuxt-config -->

```ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt 4 sets the Vite root to `app/`, so `root` points at the project
  // folder that holds `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({ root: fileURLToPath(new URL(".", import.meta.url)) }),
      tailwindcss(),
    ],
  },

  app: {
    head: {
      title: "style-generator · Nuxt plain example",
      htmlAttrs: { lang: "en" },
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap",
        },
      ],
    },
  },
});
```

Lưu file này thành `style-gen.config.json` trong thư mục dự án:

<!-- embed: examples/plain-nuxt/style-gen.config.json -->

```json
{
  "theme": "app/theme/theme.json",
  "output": "app/theme/theme.css",
  "coverage": { "colors": { "opacities": [10, 20, 50, 80] } }
}
```

## Import CSS

Import file đã sinh cạnh Tailwind. Không có dòng `@source`, vì Tailwind quét `app/`, nơi chứa mọi class literal (kể cả `app/ui`), và `theme.css` liệt kê các utility của token:

<!-- embed: examples/plain-nuxt/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "../../theme/theme.css";
```

Nếu bạn đã chạy `style-gen init`, nó cũng ghi `.claude/rules/style-generator.md`; hãy thêm `@source not "../../../.claude";` làm dòng cuối của `app/assets/css/globals.css`: file đó chứa các class ví dụ mà Tailwind sẽ quét vào nếu không loại trừ ([`style-gen init`](../reference/cli.md#rules-cho-agent)).

## Dựng một component

Mỗi component có một thư mục riêng. `style.ts` là cùng một file như ở React và Next:

<!-- embed: examples/plain-nuxt/app/ui/button/style.ts -->

```ts
import {
  COLOR_STATES,
  createVariantMapper,
} from "@duydpdev/style-generator/cva";
import type {
  ColorVariant,
  RoundedVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  contrastText,
  pick,
  recipeFromTables,
  type RecipeTables,
} from "@duydpdev/style-generator/ui";

import { tokens, type theme } from "../../theme";

const BUTTON_TINTS = ["outline", "soft", "ghost", "link"] as const;

type ButtonTint = (typeof BUTTON_TINTS)[number];

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

/** Literal classes, so Tailwind's scanner sees them: the registry emits no `focus-visible:` variant, no `/15` step and no state × opacity (`hover:bg-<key>/10`). */
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

/** The other theme keys the recipe reads: outline fill and fallback text colour, radius, type styles. `pick` throws on a missing key when the module loads, so `satisfies` moves that failure to the compiler. */
const themeKeys = {
  background: "background",
  radius: "md",
  type: "text16Medium",
  typeLg: "text20Semibold",
} as const satisfies {
  background: ColorVariant<typeof theme>;
  radius: RoundedVariant<typeof theme>;
  type: TextVariant<typeof theme>;
  typeLg: TextVariant<typeof theme>;
};

export type ButtonIntent = (typeof buttonIntents)[number];

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
    contrastText(colors, intent, themeKeys.background),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, themeKeys.radius)} border`,
    `cursor-pointer ${pick(type, themeKeys.type)} whitespace-nowrap outline-hidden select-none`,
    "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  variants: {
    variant: {
      fill: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, themeKeys.background)} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: focusRing,
    size: {
      sm: "h-7 px-2.5",
      md: "h-9 px-3.5",
      lg: `h-11 px-5 ${pick(type, themeKeys.typeLg)}`,
    },
    // Set by the components when there is no label and exactly one icon slot.
    // `px-0` must beat the size's `px-*`: the components pass the recipe through `cn` (tailwind-merge), which keeps the later class, so `iconOnly` stays after `size`.
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

export const buttonRecipe = recipeFromTables(buttonTables);
```

File `types.ts` của Vue khai báo các prop mà trình biên dịch SFC đọc được và mở rộng các prop spacing bằng `/* @vue-ignore */`. Component được import tường minh, ví dụ `import Button from "~/ui/button/Button.vue"`:

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

## Dùng nó

Hướng dẫn này chỉ dựng `Button`; các section landing page của ví dụ không được đưa vào. Thay `app/app.vue` bằng một trang dùng nó:

```vue
<script setup lang="ts">
import Button from "~/ui/button/Button.vue";
</script>

<template>
  <main
    class="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground"
  >
    <Button>Get started</Button>
    <Button variant="soft" color="danger">Delete</Button>
  </main>
</template>
```

Chạy `yarn dev`: một nút primary đặc và một nút danger dạng soft được render với màu của theme.

## Bước tiếp theo

- [Component](../components.md#ví-dụ-plain-chép-dùng): các component chép dùng được cho ứng dụng của bạn.
- [Cấu hình theme](../reference/theme.md): mọi key của theme và các quy tắc của chúng.
- [Vite và Nuxt](../reference/vite.md): các tùy chọn của plugin.
