<!-- source: documents/getting-started/nuxt-vue.md sha256: 2ff1263ca39c -->

# Bắt đầu: Nuxt + Vue

Hướng dẫn này nối `@duydpdev/style-generator` vào một ứng dụng Nuxt 4 và dựng một landing page từ các component Vue chép dùng được. Mọi khối mã bên dưới đều được chép từ [`examples/plain-nuxt`](../../../examples/plain-nuxt/README.md), thư mục này được build và kiểm tra kiểu trong CI.

## Cài đặt

Cài package và các peer dependency của nó như mô tả trong [Cài đặt](../README.md#cài-đặt). Các component còn cần `class-variance-authority`, `clsx` và `tailwind-merge`. Xem [Cài đặt](../README.md#cài-đặt) để biết cách cấu hình registry cho scope `@duydpdev` và GitHub Personal Access Token.

```bash
yarn add @duydpdev/style-generator@^7.0.0 class-variance-authority clsx tailwind-merge
```

## Tự quản lý theme

File theme JSON là [`app/theme/theme.json`](../../../examples/plain-nuxt/app/theme/theme.json) (không được nhúng ở đây). `app/theme.ts` biến nó thành token có kiểu và helper `cn`, dùng literal `options` của `app/options.ts`. Module đó không import JSON, nên `nuxt.config.ts` import nó mà không làm server khởi động lại ở mỗi lần sửa theme:

<!-- embed: examples/plain-nuxt/app/theme.ts -->

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

## Sinh theme.css bằng plugin Vite

Nuxt chạy trên Vite, nên `styleGenVite` nằm dưới `vite.plugins`. Nuxt 4 đặt root của Vite là `app/`, vì vậy các đường dẫn là đường dẫn tuyệt đối. Plugin nhận cùng literal `options` mà `app/options.ts` export và `app/theme.ts` truyền cho `createDesignTokens`; `style-gen.config.json` lặp lại nó cho CLI `generate` (`check:plain-ui` giữ hai bản bằng nhau):

<!-- embed: examples/plain-nuxt/nuxt.config.ts#nuxt-config -->

```ts
import { fileURLToPath } from "node:url";
import { defineNuxtConfig } from "nuxt/config";
import tailwindcss from "@tailwindcss/vite";
import { styleGenVite } from "@duydpdev/style-generator/vite";
import { options } from "./app/options";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-01-01",
  devtools: { enabled: false },

  // Global stylesheet entry: Tailwind v4 + the generated theme.css.
  css: ["~/assets/css/globals.css"],

  // Nuxt runs on Vite, so styleGenVite works as in plain-react. Nuxt 4 sets
  // the Vite `root` to `app/`, so the paths are absolute. `options` comes
  // from `app/options.ts`, which imports no JSON (a theme edit must not
  // restart the server) and types the tokens with the same object; the
  // `generate:theme` CLI reads the same steps from `style-gen.config.json`.
  vite: {
    plugins: [
      styleGenVite({
        themePath: fileURLToPath(
          new URL("./app/theme/theme.json", import.meta.url),
        ),
        outDir: fileURLToPath(new URL("./app/theme", import.meta.url)),
        options,
      }),
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

## Import CSS

Import file đã sinh cạnh Tailwind. Không có dòng `@source`, vì Tailwind quét `app/`, nơi chứa mọi class literal (kể cả `app/ui`), và `theme.css` liệt kê các utility của token:

<!-- embed: examples/plain-nuxt/app/assets/css/globals.css#css-entry -->

```css
@import "tailwindcss";
@import "../../theme/theme.css";
```

## Dựng một component

Mỗi component có một thư mục riêng. `style.ts` là cùng một file như ở React và Next. File `types.ts` của Vue khai báo các prop mà trình biên dịch SFC đọc được và mở rộng các prop spacing bằng `/* @vue-ignore */`. Component được import tường minh, ví dụ `import Button from "~/ui/button/Button.vue"`:

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

## Sử dụng

<!-- embed: examples/plain-nuxt/app/pages/index.vue#usage -->

```vue
<template>
  <Box backgroundColor="background" class="min-h-screen text-foreground">
    <Box
      as="header"
      position="sticky"
      backdropBlur="md"
      borderB="thin"
      borderColor="line"
      class="top-0 z-10 bg-background/80"
    >
      <Container>
        <Flex align="center" justify="between" :gap="4" :py="4">
          <Link href="#hero" tone="foreground" underline="none">
            <Text as="span" type="text16Medium">style-generator</Text>
          </Link>
          <Flex as="nav" aria-label="Main" align="center" :gap="4">
            <Link href="#features" tone="muted">Features</Link>
            <Link href="#pricing" tone="muted">Pricing</Link>
            <Link :href="DOCS_URL" tone="muted">Docs</Link>
            <ThemeSwitch />
          </Flex>
        </Flex>
      </Container>
    </Box>
    <main>
      <Hero />
      <Features />
      <Pricing />
      <Cta />
    </main>
    <Footer />
  </Box>
</template>
```

## Bước tiếp theo

- [Component](../components.md#ví-dụ-plain-chép-dùng): các component chép dùng được cho ứng dụng của bạn.
- [Cấu hình theme](../reference/theme.md): mọi key của theme và các quy tắc của chúng.
- [Vite và Nuxt](../reference/vite.md): các tùy chọn của plugin.
