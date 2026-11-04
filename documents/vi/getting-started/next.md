<!-- source: documents/getting-started/next.md sha256: f6211095ff49 -->

# Bắt đầu: Next.js

Hướng dẫn này nối `@duydpdev/style-generator` vào Next.js (webpack hoặc Turbopack) và dựng một landing page từ các component chép dùng được. Mọi khối mã bên dưới đều được chép từ [`examples/next-v4`](../../../examples/next-v4/README.md), thư mục này được build và kiểm tra kiểu trong CI.

## Cài đặt

Cài package và các peer dependency của nó như mô tả trong [Cài đặt](../README.md#cài-đặt). Các component còn cần `class-variance-authority`, `clsx` và `tailwind-merge`. Xem [Cài đặt](../README.md#cài-đặt) để biết cách cấu hình registry cho scope `@duydpdev` và GitHub Personal Access Token.

```bash
yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge
```

## Tự quản lý theme

File theme JSON là [`src/theme/theme.json`](../../../examples/next-v4/src/theme/theme.json) (không được nhúng ở đây). `src/theme.ts` biến nó thành token có kiểu và helper `cn`:

<!-- embed: examples/next-v4/src/theme.ts -->

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

## Sinh theme.css bằng hàm bọc của Next.js

`styleGenNext` ghi `src/theme/theme.css` khi `next dev` hoặc `next build` nạp config; một theme nằm trong ứng dụng thì không cần `transpilePackages`.

<!-- embed: examples/next-v4/next.config.ts#next-config -->

```ts
import type { NextConfig } from "next";
import { styleGenNext } from "@duydpdev/style-generator/next";

const nextConfig: NextConfig = {};

// Next.js runs on Turbopack/webpack (no Vite), so the Vite-only `styleGenVite`
// plugin does not apply. `styleGenNext` does not import `next`, so it works
// under both bundlers. It writes `src/theme/theme.css` when Next loads this
// config in `phase-development-server` (`next dev`, which also watches the
// theme JSON) or `phase-production-build` (`next build`). No generator
// options: the defaults (breakpoints `md` and `lg`) are what `src/theme.ts`
// types the tokens with.
export default styleGenNext({
  themePath: "src/theme/theme.json",
  outDir: "src/theme",
})(nextConfig);
```

## Import CSS

Import file đã sinh cạnh Tailwind. Không cần dòng `@source`: Tailwind quét `src/`, và `theme.css` liệt kê mọi utility của token trong `@source inline(...)`.

<!-- embed: examples/next-v4/src/app/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "../theme/theme.css";
```

## Dựng một component

Mỗi component có một thư mục riêng. `style.ts` chứa các bảng style, còn `Button.tsx` không có `'use client'` vì không dùng hook, nên có thể render trong server component:

<!-- embed: examples/next-v4/src/ui/button/style.ts -->

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

<!-- embed: examples/next-v4/src/ui/button/Button.tsx -->

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

## Ghép trang

<!-- embed: examples/next-v4/src/app/page.tsx -->

```tsx
import { App } from "../App";

/** The landing page. A server component: only `ThemeSwitch` is a client component. */
export default function Page() {
  return <App />;
}
```

## Chuyển sang dark

`themeAxisAttributes` từ `@duydpdev/style-generator/recipes` quản lý các attribute `data-*` trên `<html>`. Một client component áp các attribute sau khi hydrate:

<!-- embed: examples/next-v4/src/ThemeSwitch.tsx -->

```tsx
"use client";

import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";
import { useEffect, useState } from "react";
import type { JSX } from "react";

import type { theme } from "./theme";
import { Button } from "./ui/button";

/** `{ "data-theme": "dark" }`; the light theme is the base theme (no attribute). */
const DARK = themeAxisAttributes<typeof theme>({ theme: "dark" });

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

## Bước tiếp theo

- [Component](../components.md#ví-dụ-plain-chép-dùng): các component chép dùng được cho ứng dụng của bạn.
- [Cấu hình theme](../reference/theme.md): mọi key của theme và các quy tắc của chúng.
- [Next.js](../reference/next.md): các tùy chọn của hàm bọc.
