<!-- source: documents/getting-started/next.md sha256: c51d10d5bd8d -->

# Bắt đầu: Next.js

Hướng dẫn này nối `@duydpdev/style-generator` vào Next.js (webpack hoặc Turbopack) và render một `Button` có theme, dựng từ một component chép dùng được. Theme, các file của `Button` và theme switch được nhúng từ [`examples/plain-react`](../../../examples/plain-react/README.md), nơi các bản sao giống hệt nhau; các file riêng của Next.js (config và trang) được hiển thị dưới dạng các đoạn mã độc lập, và không có thư mục ví dụ Next.js chạy được.

## Cài đặt

Bắt đầu từ một ứng dụng Next.js được tạo cùng Tailwind (`yarn create next-app my-app --ts --tailwind --src-dir --app`), lệnh này cài `tailwindcss` và phần tích hợp bundler của nó. Cài package và các peer dependency của nó như mô tả trong [Cài đặt](../README.md#cài-đặt). Các component còn cần `class-variance-authority`, `clsx` và `tailwind-merge`.

```bash
yarn add @duydpdev/style-generator@^8.0.0 class-variance-authority clsx tailwind-merge
```

## Tạo theme

Tạo `src/theme/theme.json`. `Button` bên dưới đọc các màu `primary`, `secondary`, `success`, `danger`, `background` và `foreground`, bo góc `md` cùng các kiểu chữ `text16Medium` và `text20Semibold`, nên hãy bắt đầu từ theme đầy đủ này (chính là `examples/plain-react/src/theme/theme.json`):

<!-- embed: examples/plain-react/src/theme/theme.json -->

```json
{
  "colors": {
    "primary": "#2647D9",
    "primaryHover": "#1F3BB8",
    "primaryActive": "#19319A",
    "primarySelected": "$primary",
    "primaryForeground": "$surface",
    "secondary": "#6E5BFF",
    "accent": "$secondary",
    "success": "#2E7D5B",
    "danger": "#C8462C",
    "primarySubtle": "color-mix(in srgb, var(--sg-color-primary) 10%, transparent)",
    "primarySubtleForeground": "$primary",
    "secondarySubtle": "color-mix(in srgb, var(--sg-color-secondary) 10%, transparent)",
    "secondarySubtleForeground": "$secondary",
    "successSubtle": "color-mix(in srgb, var(--sg-color-success) 10%, transparent)",
    "successSubtleForeground": "$success",
    "dangerSubtle": "color-mix(in srgb, var(--sg-color-danger) 10%, transparent)",
    "dangerSubtleForeground": "$danger",
    "background": "#FAF7F2",
    "surface": "#FFFFFF",
    "foreground": "#0F1530",
    "muted": "#6B6D7A",
    "border": "color-mix(in srgb, var(--sg-color-foreground) 8%, transparent)",
    "focus": "$primary"
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
  "controlHeight": {
    "sm": "1.75rem",
    "md": "2.25rem",
    "lg": "2.75rem"
  },
  "iconSize": {
    "sm": "1rem",
    "md": "1.25rem",
    "lg": "1.5rem"
  },
  "opacity": {
    "disabled": 0.5
  },
  "motionDuration": {
    "fast": "150ms",
    "slow": "300ms"
  },
  "motionEasing": {
    "standard": "cubic-bezier(0.2, 0, 0, 1)"
  },
  "zIndex": {
    "overlay": 40,
    "modal": 50
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

`yarn style-gen init` ([Bắt đầu nhanh](../README.md#bắt-đầu-nhanh)) ghi theme khởi đầu riêng của nó vào `src/styles/theme.json` và một `style-gen.config.json` trỏ tới đó. Hướng dẫn này giữ theme trong `src/theme/`: hoặc bỏ qua `init`, hoặc xóa thư mục `src/styles/` mà nó đã ghi và thay `style-gen.config.json` bằng file hiển thị bên dưới.

## Tự quản lý theme

`src/theme.ts` biến JSON thành kiểu `theme` và helper `cn`, đồng thời re-export `tokens` có kiểu mà `style-gen generate` (và `styleGenNext` khi `next dev`/`next build`) ghi vào `src/theme/theme.tokens.ts`. Hãy chạy `yarn style-gen generate` một lần và commit file đó; `style-gen generate --check` thất bại trong CI khi nó lỗi thời:

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

## Sinh theme.css bằng hàm bọc của Next.js

`styleGenNext()` không nhận tùy chọn generator nào: nó đọc `style-gen.config.json` (hoặc `package.json["style-gen"]`) ở root dự án, chính file mà `style-gen generate` đọc. Nó ghi `src/theme/theme.css` và `src/theme/theme.tokens.ts` khi `next dev` hoặc `next build` nạp config; một theme nằm trong ứng dụng thì không cần `transpilePackages`. Lưu file này thành `style-gen.config.json`:

<!-- embed: examples/plain-react/style-gen.config.json -->

```json
{
  "theme": "src/theme/theme.json",
  "output": "src/theme/theme.css",
  "coverage": { "colors": { "opacities": [10, 20, 50, 80] } }
}
```

Sau đó bọc `next.config.ts` mà `create-next-app` đã tạo; đừng thay nó bằng một object rỗng. Giữ mọi tùy chọn nó đã ghi, đặc biệt là `turbopack.rules`:

```ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Runs Tailwind on your CSS under Turbopack; written by `create-next-app --tailwind`.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin does not apply. `styleGenNext` does not import `next`, so it works
// under both bundlers. It writes `src/theme/theme.css` when Next loads this
// config in `phase-development-server` (`next dev`, which also watches the
// theme JSON and the config file) or `phase-production-build` (`next build`).
export default styleGenNext()(nextConfig);
```

Không có loader Tailwind, `next build` vẫn thành công nhưng xuất ra các rule `@theme`/`@source` thô và không có utility nào, còn `next dev` chỉ in cảnh báo `Unknown at rule`. Nếu config của bạn không có khối Tailwind (ứng dụng được tạo không có `--tailwind`, hoặc build bằng webpack), hãy chạy `yarn add tailwindcss @tailwindcss/postcss` và thêm `postcss.config.mjs`:

```js
// postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
```

## Import CSS

Thay nội dung của `src/app/globals.css` bằng file đã sinh cạnh Tailwind (các khối `:root` và `@theme inline` của scaffold định nghĩa một `--color-background` sẽ xung đột với màu `background` của theme). Không cần dòng `@source`: Tailwind quét `src/`, và `theme.css` liệt kê mọi utility của token trong `@source inline(...)`.

```css
@import "tailwindcss";
@import "../theme/theme.css";
```

Nếu bạn đã chạy `style-gen init`, nó cũng ghi `.claude/rules/style-generator.md`; hãy thêm `@source not "../../.claude";` làm dòng cuối của `src/app/globals.css`: file đó chứa các class ví dụ mà Tailwind sẽ quét vào nếu không loại trừ ([`style-gen init`](../reference/cli.md#rules-cho-agent)).

## Dựng một component

Mỗi component có một thư mục riêng. `style.ts` chứa các bảng style, còn `Button.tsx` không có `'use client'` vì không dùng hook, nên có thể render trong server component:

<!-- embed: examples/plain-react/src/ui/button/style.ts -->

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

export type ButtonIntent = (typeof buttonIntents)[number];

const colors: readonly string[] = tokens.colors;
// `bg-primary hover:bg-primary-hover active:bg-primary-active` when the theme declares the state siblings.
const bgStates = createVariantMapper("bg", tokens.colors, {
  states: COLOR_STATES,
});
const bg = createVariantMapper("bg", tokens.colors);
const text = createVariantMapper("text", tokens.colors);
const border = createVariantMapper("border", tokens.colors);
const rounded = createVariantMapper("rounded", tokens.borderRadius);
const height = createVariantMapper("h-control", tokens.controlHeight);
const type = createVariantMapper("", tokens.typography);

/** A solid intent: state backgrounds, `<intent>Foreground` text (else `text-background`), `hover:opacity-90` without an `<intent>Hover` color. */
const solid = (intent: ButtonIntent): string[] => {
  const classes = [
    pick(bgStates, intent),
    contrastText(colors, intent, themeKeys.background),
  ];
  if (!colors.includes(`${intent}Hover`)) classes.push("hover:opacity-90");
  return classes;
};

/** The other variants: `outline`/`ghost` hover on `<intent>Subtle`, `soft` is `<intent>Subtle` with `<intent>SubtleForeground` text. */
const tint = (intent: ButtonIntent): Record<ButtonTint, string[]> => ({
  outline: [pick(border, intent), pick(text, intent), hoverTint[intent]],
  soft: [
    pick(bg, `${intent}Subtle`),
    pick(text, `${intent}SubtleForeground`),
    "hover:opacity-90",
  ],
  ghost: [pick(text, intent), hoverTint[intent]],
  link: [pick(text, intent)],
});

/** Button as data: variant × intent × size. */
export const buttonTables = {
  base: [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    `${pick(rounded, themeKeys.radius)} border`,
    `cursor-pointer ${pick(type, themeKeys.type)} whitespace-nowrap outline-hidden select-none`,
    `focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 ${stateClasses.focus.focus}`,
    "transition-[background-color,color,opacity] duration-150",
    `disabled:cursor-not-allowed ${stateClasses.disabled.disabled}`,
  ],
  variants: {
    variant: {
      solid: "border-transparent active:scale-[0.98]",
      outline: `${pick(bg, themeKeys.background)} active:scale-[0.98]`,
      soft: "border-transparent active:scale-[0.98]",
      ghost: "border-transparent active:scale-[0.98]",
      link: "border-transparent underline-offset-4 hover:underline",
    },
    color: Object.fromEntries(buttonIntents.map((intent) => [intent, ""])),
    size: {
      sm: `${pick(height, themeKeys.height.sm)} px-2.5`,
      md: `${pick(height, themeKeys.height.md)} px-3.5`,
      lg: `${pick(height, themeKeys.height.lg)} px-5 ${pick(type, themeKeys.typeLg)}`,
      icon: `${pick(height, themeKeys.height.md)} aspect-square px-0`,
    },
    // Set by the components when there is no label and exactly one icon slot.
    // `px-0` must beat the size's `px-*`: the components pass the recipe through `cn` (tailwind-merge), which keeps the later class, so `iconOnly` stays after `size`.
    iconOnly: { true: "aspect-square px-0" },
  },
  compoundVariants: buttonIntents.flatMap((intent) => {
    const tints = tint(intent);
    return [
      { color: intent, variant: "solid", class: solid(intent) },
      ...BUTTON_TINTS.map((variant) => ({
        color: intent,
        variant,
        class: tints[variant],
      })),
    ];
  }),
  defaultVariants: {
    variant: "solid",
    color: buttonIntents[0],
    size: "md",
  },
} satisfies RecipeTables;

export const buttonRecipe = recipeFromTables(buttonTables);
```

`types.ts` chứa các kiểu prop:

<!-- embed: examples/plain-react/src/ui/button/types.ts -->

```ts
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType, ReactNode } from "react";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

export type ButtonOwnProps = ThemeSpacingProps<typeof tokens> & {
  readonly variant?:
    | "solid"
    | "outline"
    | "soft"
    | "ghost"
    | "link"
    | undefined;
  /** One of `buttonIntents`. */
  readonly color?: ButtonIntent | undefined;
  readonly size?: "sm" | "md" | "lg" | "icon" | undefined;
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

`Button.tsx` là component:

<!-- embed: examples/plain-react/src/ui/button/Button.tsx -->

```tsx
import { mergeStyle, splitSpacing } from "@duydpdev/style-generator/ui";
import {
  Fragment,
  isValidElement,
  type ElementType,
  type JSX,
  type ReactNode,
} from "react";

import { cn, tokens } from "../../theme";

import { buttonRecipe } from "./style";
import type { ButtonProps } from "./types";

/**
 * An icon slot is a flex box so an inline-level icon (an inline-block wrapper,
 * `<iconify-icon>`) is centred instead of sitting on the 24px line box's baseline.
 * `empty:hidden` drops a slot whose content rendered nothing, so it takes no `gap`.
 */
const ICON_SLOT = "flex shrink-0 items-center empty:hidden";

/**
 * Whether a slot renders something, matching `Button.vue`: not `null`/`undefined`, a
 * boolean (`{open && "Label"}`), blank text, or an array/fragment holding only such entries.
 */
const present = (node: ReactNode): boolean => {
  if (Array.isArray(node)) return node.some(present);
  if (node == null || typeof node === "boolean") return false;
  if (typeof node === "string") return node.trim() !== "";
  if (isValidElement<{ children?: ReactNode }>(node) && node.type === Fragment)
    return present(node.props.children);
  return true;
};

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

`index.ts` là entry công khai của thư mục:

<!-- embed: examples/plain-react/src/ui/button/index.ts -->

```ts
export { Button } from "./Button";
export type { ButtonOwnProps, ButtonProps } from "./types";
```

## Ghép trang

Hướng dẫn này chỉ dựng `Button`; các section landing page của ví dụ không được đưa vào. Thay `src/app/page.tsx` bằng một server component dùng nó (`Button` không có hook, nên không cần `"use client"`):

<!-- snippet: no-check imports ../ui/button from the app being built -->

```tsx
import { Button } from "../ui/button";

export default function Page() {
  return (
    <main className="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground">
      <Button>Get started</Button>
      <Button variant="soft" color="danger">
        Delete
      </Button>
    </main>
  );
}
```

## Chuyển sang dark

`themeAxisAttributes` từ `@duydpdev/style-generator/recipes` quản lý các attribute `data-*` trên `<html>`. Một client component áp các attribute sau khi hydrate. Trong Next.js file bắt đầu bằng `"use client";`; phần còn lại là `examples/plain-react/src/ThemeSwitch.tsx` giữ nguyên:

<!-- embed: examples/plain-react/src/ThemeSwitch.tsx -->

```tsx
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import type { ThemeAxesState } from "./theme/theme.tokens";
import { Button } from "./ui/button";

const DARK_STATE: ThemeAxesState = { theme: "dark" };

/** `{ "data-theme": "dark" }`; the light theme is the base theme (no attribute). */
const DARK = themeAxisAttributes(DARK_STATE);

/** Light/dark toggle: sets or removes the `theme` axis attribute on `<html>`. */
export function ThemeSwitch(): JSX.Element {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    for (const [name, value] of Object.entries(DARK)) {
      if (dark) root.setAttribute(name, value);
      else root.removeAttribute(name);
    }
  }, [dark]);

  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={dark}
      onClick={() => {
        setDark((on) => !on);
      }}
    >
      Dark mode
    </Button>
  );
}
```

Lưu nó thành `src/ThemeSwitch.tsx` với `"use client";` là dòng đầu tiên (override `themeAxes.theme.dark` mà nó bật/tắt đã có trong theme ở trên), import nó trong `src/app/page.tsx` bằng `import { ThemeSwitch } from "../ThemeSwitch";` và render `<ThemeSwitch />` cạnh các nút.

## Bước tiếp theo

- [Component](../components.md#ví-dụ-plain-chép-dùng): các component chép dùng được cho ứng dụng của bạn.
- [Cấu hình theme](../reference/theme.md): mọi key của theme và các quy tắc của chúng.
- [Next.js](../reference/next.md): các tùy chọn của hàm bọc.
