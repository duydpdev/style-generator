# FE Style Generator

Library to automatically generate a **Design System** for Tailwind CSS from a theme configuration file.
Supports both **Tailwind CSS v4** and **v3**.

## Features

- 🎨 **Theme Config**: Define colors, typography, spacing, shadows, etc. from a single source.
- 🌗 **Dark / Light Mode**: Auto-generate CSS Variables with `html[data-theme='light/dark']`.
- ⚡ **Tailwind v4 Support**: Fully compatible with `@plugin` and `@source`.
- 🔄 **Backward Compatibility**: Supports traditional Tailwind v3 config.
- 🚀 **CSS Custom Properties for Spacing**: Zero safelist for spacing — uses `.sp-*` utility classes with `var()` fallback chains for responsive support.
- 🛡️ **Smart Safelist**: Only safelists custom tokens (colors, typography, shadows, layout) — not built-in utilities.
- 📱 **Dynamic Breakpoints**: Override screen widths and select breakpoints dynamically.
- ⚙️ **Feature Flags**: Toggle CSS Variables and Responsive per project.

---

## 1. Installation

```bash
yarn add @duydpdev/style-generator
# or
npm install @duydpdev/style-generator
```

---

## 2. Theme Config

Create a `theme.json` file with your design tokens:

```json
{
  "colors": {
    "base": { "primary": "#3B82F6", "background": "#FFFFFF" },
    "text": { "main": "#111827", "muted": "#6B7280" }
  },
  "typography": {
    "text16Medium": {
      "fontSize": "16px",
      "lineHeight": "24px",
      "fontWeight": 500,
      "letterSpacing": "0px"
    }
  },
  "shadows": { "sm": "0 1px 2px rgba(0,0,0,0.05)" },
  "borderRadius": { "md": "0.375rem" }
}
```

### Multi-theme (Dark/Light/Custom)

Add a `themes` key containing named theme overrides. Each entry only needs **values that differ from the default**:

```json
{
  "colors": {
    "base": { "primary": "#3B82F6", "background": "#FFFFFF" },
    "text": { "main": "#111827" }
  },

  "themes": {
    "dark": {
      "colors": {
        "base": { "background": "#000000" },
        "text": { "main": "#FFFFFF" }
      },
      "shadows": { "sm": "0 1px 2px rgba(255,255,255,0.1)" }
    },
    "high-contrast": {
      "colors": {
        "text": { "main": "#000000" }
      }
    }
  }
}
```

**Auto-generated CSS output:**

```css
:root {
  --color-base-primary: #3b82f6;
  --color-base-background: #ffffff;
  --color-text-main: #111827;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
}

html[data-theme="dark"] {
  --color-base-background: #000000;
  --color-text-main: #ffffff;
  --shadow-sm: 0 1px 2px rgba(255, 255, 255, 0.1);
}

html[data-theme="high-contrast"] {
  --color-text-main: #000000;
}
```

**Activate a theme:**

```html
<html data-theme="dark">
  ...
</html>
```

> **No `themes` key?** → Only default CSS variables are generated (`:root` only). Backward compatible.

---

## 3. Usage with Tailwind CSS v4

### Step 1: Create Plugin File

```typescript
import { createStyleSystem, Breakpoint } from "@duydpdev/style-generator";
import theme from "../styles/theme.json";
import fs from "fs";
import path from "path";

const options = {
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
};

const { plugin, safelist } = createStyleSystem(theme, options);

// Export plugin for Tailwind v4
export default plugin;

// Script: generate safelist.txt
if (process.argv[1] === import.meta.filename) {
  const outPath = path.resolve(import.meta.dirname, "../styles/safelist.txt");
  fs.writeFileSync(outPath, safelist.join("\n"), "utf8");
  console.log("✅ Safelist generated!");
}
```

### Step 2: Import in CSS

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "./safelist.txt";
```

---

## 4. Usage with Tailwind CSS v3

```typescript
import type { Config } from "tailwindcss";
import { createStylePlugin, Breakpoint } from "@duydpdev/style-generator";
import theme from "./theme.json";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  plugins: [
    createStylePlugin(theme, {
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG],
    }),
  ],
};

export default config;
```

---

## 5. Spacing — CSS Custom Properties

Spacing uses CSS custom properties instead of safelist, reducing class count from **~4,800 to 0**.

The plugin generates fixed `.sp-*` utility classes with `var()` fallback chains:

```css
/* Base */
.sp-p {
  padding: var(--sp-p);
}
.sp-mx {
  margin-left: var(--sp-mx);
  margin-right: var(--sp-mx);
}

/* Responsive (mobile-first) */
@media (min-width: 768px) {
  .sp-p {
    padding: var(--sp-p-md, var(--sp-p));
  }
}
@media (min-width: 1024px) {
  .sp-p {
    padding: var(--sp-p-lg, var(--sp-p-md, var(--sp-p)));
  }
}
```

### Usage in Components

Use the `resolveSpacing` / `resolveSpacingProps` helpers to map props to CSS variables:

```tsx
import { resolveSpacingProps } from "@duydpdev/style-generator";

const Box = ({ p, px, py, m, mx, my, className, children, ...rest }) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });

  return (
    <div
      className={twMerge(spacing.classNames.join(" "), className)}
      style={{ ...spacing.style, ...rest.style }}
    >
      {children}
    </div>
  );
};

// Simple
<Box p={4} />
// → class="sp-p" style="--sp-p: 1rem"

// Responsive
<Box p={{ base: 2, md: 4, lg: 8 }} />
// → class="sp-p" style="--sp-p: 0.5rem; --sp-p-md: 1rem; --sp-p-lg: 2rem"

// Any value works (no safelist limitation)
<Box p={13.5} />
// → class="sp-p" style="--sp-p: 3.375rem"
```

---

## 6. Options

```typescript
createStyleSystem(theme, {
  // Breakpoints & Screens
  screens: { md: "800px", "3xl": "1920px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],

  // Spacing (CSS custom properties)
  spacing: {
    enabled: true, // default: true
    // properties: { ... },  // override/extend default property mapping
  },

  // Module configs (safelist-based)
  layout: { enabled: true }, // display, flex, align...
  rounded: { values: ["none", "md", "lg", "full"] }, // customize values
  border: { values: [0, 1, 2] }, // customize values
  opacity: { enabled: true },
  zIndex: { enabled: true },

  // Extra dynamic classes
  dynamicClasses: ["animate-spin", "animate-pulse"],

  // Feature flags
  enableCssVariables: true, // default: true
  enableResponsive: true, // default: true

  // Responsive modules (which safelist modules get responsive prefixes)
  responsiveModules: ["layout", "rounded"],
});
```

### Options Reference

| Option               | Type                           | Default                 | Description                                              |
| :------------------- | :----------------------------- | :---------------------- | :------------------------------------------------------- |
| `screens`            | `Record<string, string>`       | Tailwind defaults       | Custom screen widths.                                    |
| `breakpoints`        | `(Breakpoint \| string)[]`     | `["md", "lg"]`          | Breakpoints for responsive spacing and safelist.         |
| `spacing`            | `{ enabled?, properties? }`    | Enabled, all props      | Spacing via CSS custom properties. Zero safelist.        |
| `layout`             | `ModuleConfig<string>`         | All layout classes      | Layout classes (hidden, flex, items-center...).          |
| `rounded`            | `ModuleConfig<string>`         | 9 values                | Border radius values for safelist.                       |
| `border`             | `ModuleConfig<number>`         | `[0, 1, 2, 4]`          | Border width values for safelist.                        |
| `opacity`            | `ModuleConfig<number>`         | 0-100 step 5            | Opacity values for safelist.                             |
| `zIndex`             | `ModuleConfig<number\|string>` | `[0,10,..,50,"auto"]`   | Z-index values for safelist.                             |
| `dynamicClasses`     | `string[]`                     | `[]`                    | Extra classes to add to safelist.                        |
| `enableCssVariables` | `boolean`                      | `true`                  | Generate `:root` / `html[data-theme]` CSS variables.     |
| `enableResponsive`   | `boolean`                      | `true`                  | Generate responsive spacing rules and safelist variants. |
| `responsiveModules`  | `StyleModule[]`                | `["layout", "rounded"]` | Which safelist modules get responsive prefixes.          |

### Use Cases

| Project type                      | Config                                                                                    |
| :-------------------------------- | :---------------------------------------------------------------------------------------- |
| **Full (multi-platform web app)** | `{}` (defaults)                                                                           |
| **Mobile-only or Desktop-only**   | `{ enableResponsive: false }` — no responsive spacing/safelist                            |
| **No dark mode / CSS vars**       | `{ enableCssVariables: false }`                                                           |
| **Minimal safelist**              | `{ layout: { enabled: false }, opacity: { enabled: false }, zIndex: { enabled: false } }` |

---

## 7. Exports API

| Function              | Input                  | Description                                                                           |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `createStylePlugin`   | `(theme, options?)`    | Creates a Tailwind Plugin. Injects CSS variables, screens, typography, spacing rules. |
| `createStyleSystem`   | `(theme, options?)`    | **Recommended**. Returns `{ plugin, safelist }`.                                      |
| `generateSafelist`    | `(theme, options?)`    | Generates `string[]` safelist (excludes spacing).                                     |
| `createDesignTokens`  | `(theme, options?)`    | Generates design tokens object for consumer apps.                                     |
| `resolveSpacing`      | `(prop, value, unit?)` | Maps a single spacing prop to `{ className, style }`.                                 |
| `resolveSpacingProps` | `(props)`              | Maps multiple spacing props to `{ classNames, style }`.                               |

---

## 8. TypeScript cho consumer (pattern khuyến nghị)

### 8.1. Gõ kiểu cho `theme` và API factories

**Cách 1 – Dùng `theme.ts` với `as const` (khuyến nghị):**

```ts
// styles/theme.ts
import type { ThemeConfig } from "@duydpdev/style-generator";

export const theme = {
  colors: {
    base: { primary: "#3B82F6", background: "#FFFFFF" } as const,
    text: { main: "#111827", muted: "#6B7280" } as const,
  },
  typography: {
    text16Medium: {
      fontSize: "16px",
      lineHeight: "24px",
      fontWeight: 500,
      letterSpacing: "0px",
    },
  },
  shadows: {
    sm: "0 1px 2px rgba(0,0,0,0.05)",
  },
  borderRadius: {
    md: "0.375rem",
  },
} satisfies ThemeConfig;

export type AppTheme = typeof theme;
```

Khi đó trong plugin Tailwind:

```ts
import { createStyleSystem } from "@duydpdev/style-generator";
import { theme } from "./styles/theme";

const { plugin, safelist } = createStyleSystem(theme, {
  // TypeScript sẽ infer theo `AppTheme`
});
```

**Cách 2 – `theme.json` + `as const`:**

```ts
import themeJson from "./styles/theme.json";
import { createStyleSystem } from "@duydpdev/style-generator";

const theme = themeJson as const;

const { plugin, safelist } = createStyleSystem(theme, {
  // Generics sẽ infer từ literal types của JSON
});
```

### 8.2. Dùng Design Tokens để gõ variant props

```ts
import { createDesignTokens } from "@duydpdev/style-generator";
import { theme } from "./styles/theme";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});

type ColorVariant = (typeof DesignTokens.Web.variantColor)[number];
type TextVariant = (typeof DesignTokens.Web.variantText)[number];

interface ButtonProps {
  color?: ColorVariant;
  textVariant?: TextVariant;
}
```

Hoặc với `cva`:

```ts
import { cva } from "class-variance-authority";

const button = cva("base-class", {
  variants: {
    color: DesignTokens.Web.variantColor.reduce<Record<string, string>>(
      (acc, c) => {
        acc[c] = `bg-${c}`;
        return acc;
      },
      {},
    ),
    textVariant: DesignTokens.Web.variantText.reduce<Record<string, string>>(
      (acc, t) => {
        acc[t] = t;
        return acc;
      },
      {},
    ),
  },
});

type ButtonColor = keyof typeof button.variants.color;
type ButtonTextVariant = keyof typeof button.variants.textVariant;
```

### 8.3. Gõ kiểu cho spacing props

Các helper `resolveSpacing` / `resolveSpacingProps` hoạt động tốt với TypeScript mà không cần thêm type phức tạp:

```ts
import { resolveSpacingProps } from "@duydpdev/style-generator";

type SpacingValue =
  | number
  | {
      base?: number;
      md?: number;
      lg?: number;
    };

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  p?: SpacingValue;
  px?: SpacingValue;
  py?: SpacingValue;
  m?: SpacingValue;
  mx?: SpacingValue;
  my?: SpacingValue;
}

export const Box: React.FC<BoxProps> = ({
  p,
  px,
  py,
  m,
  mx,
  my,
  className,
  style,
  ...rest
}) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });

  return (
    <div
      {...rest}
      className={[...spacing.classNames, className].filter(Boolean).join(" ")}
      style={{ ...spacing.style, ...style }}
    />
  );
};
```

### 8.4. Bắt lỗi type sớm với tokens

Vì `DesignTokens` giữ literal union type, TypeScript sẽ báo lỗi nếu dùng sai token:

```ts
const invalidColor: (typeof DesignTokens.Web.variantColor)[number] = "oops"; // ❌ lỗi TS
```

Điều này giúp consumer bắt sai lệch giữa theme và UI layer ngay ở compile-time, đúng mục tiêu “Design System as single source of truth”. 
