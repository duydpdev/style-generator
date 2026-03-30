# FE Style Generator

Library to automatically generate a **Design System** for Tailwind CSS from a theme configuration file.
Supports both **Tailwind CSS v4** and **v3**.

## Features

- 🎨 **Flat Theme Config**: Define all colors in a single flat namespace — no more `base/text/common` split.
- 🌗 **Dark / Light Mode**: Auto-generate CSS Variables with `[data-theme='dark']`.
- ⚡ **Tailwind v4 Support**: `generateThemeCss()` outputs `@theme inline` block for full v4 auto-utilities.
- 🔄 **Backward Compatibility**: Supports traditional Tailwind v3 config.
- 🚀 **CSS Custom Properties for Spacing**: Zero safelist for spacing — uses `.sp-*` utility classes with `var()` fallback chains.
- 🛡️ **Smart Safelist**: Color classes are optional (`safelistColors: true`). Only safelists typography, shadows, layout, etc. by default.
- 📱 **Dynamic Breakpoints**: Override screen widths and select breakpoints dynamically.
- 🖥️ **CLI Tool**: `style-gen` — scaffold projects and generate safelist from the command line.

---

## 1. Installation

```bash
yarn add @duydpdev/style-generator
# or
npm install @duydpdev/style-generator
```

---

## 2. Quick Start with CLI

The fastest way to get started is using the built-in `style-gen` CLI tool.

### Step 1. Initialize project

```bash
npx style-gen init
```

The interactive wizard will prompt you to:

- Choose your Tailwind version (v3 or v4)
- Set the theme file location (default: `styles/theme.json`)
- Set the plugin file location (default: `plugins/theme-plugin.ts`)
- Optionally include a dark mode template

### Step 2. Edit theme

Open `styles/theme.json` and customize your design tokens. Colors are a **flat object** — no namespaces.

```json
{
  "colors": {
    "primary": "#3B82F6",
    "secondary": "#6366F1",
    "background": "#FFFFFF",
    "foreground": "#111827",
    "muted": "#6B7280"
  },
  "typography": {
    "heading1": {
      "fontSize": "32px",
      "lineHeight": "120%",
      "fontWeight": 700,
      "letterSpacing": "-0.02em"
    }
  },
  "shadows": { "sm": "0px 1px 2px rgba(0, 0, 0, 0.05)" },
  "borderRadius": { "sm": "4px", "md": "8px", "lg": "12px" }
}
```

### Step 3. Generate safelist

```bash
npx style-gen safelist
```

### Step 4. Import in CSS (Tailwind v4)

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "../styles/safelist.txt";
```

For v4 users who want `@theme inline` auto-utilities (`bg-primary`, etc.), write the `themeCss` output to a CSS file:

```typescript
import { createStyleSystem } from "@duydpdev/style-generator";
import fs from "node:fs";

const { themeCss } = createStyleSystem(theme, options);
fs.writeFileSync("styles/theme.css", themeCss, "utf8");
```

Then import in your CSS:

```css
@import "tailwindcss";
@import "./theme.css"; /* @theme inline block */
@plugin "./plugins/theme-plugin.ts";
@source "../styles/safelist.txt";
```

---

## 3. CLI Reference

### Commands

#### `style-gen init`

Scaffold project files (theme config + plugin file).

```bash
npx style-gen init                    # Interactive mode (prompts)
npx style-gen init --tw v4 --dark     # Non-interactive mode
```

| Flag       | Type      | Default                   | Description                     |
| :--------- | :-------- | :------------------------ | :------------------------------ |
| `--tw`     | `string`  | —                         | Tailwind version (`v3` or `v4`) |
| `--theme`  | `string`  | `styles/theme.json`       | Path to theme config file       |
| `--plugin` | `string`  | `plugins/theme-plugin.ts` | Path to plugin file             |
| `--dark`   | `boolean` | `false`                   | Include dark mode template      |

#### `style-gen safelist`

Generate `safelist.txt` from theme config.

```bash
npx style-gen safelist
npx style-gen safelist --theme ./theme.json --out ./safelist.txt --watch
```

| Flag            | Type      | Default               | Description                          |
| :-------------- | :-------- | :-------------------- | :----------------------------------- |
| `--theme`       | `string`  | `styles/theme.json`   | Path to theme JSON file              |
| `--out`         | `string`  | `styles/safelist.txt` | Path to output safelist file         |
| `-w`, `--watch` | `boolean` | `false`               | Watch mode — auto-regenerate on save |

#### `style-gen doctor`

Check project setup, validate configuration, and verify theme schema. Also warns if old v1 `colors.base/text/common` format is detected.

```bash
npx style-gen doctor
```

### Configuration file

```json
{
  "theme": "styles/theme.json",
  "output": "styles/safelist.txt",
  "plugin": "plugins/theme-plugin.ts",
  "breakpoints": ["md", "lg"],
  "responsiveModules": ["layout", "rounded"]
}
```

---

## 4. Theme Config

### Colors (flat)

All colors live in a single flat namespace. Nested objects and `DEFAULT` key are supported.

```json
{
  "colors": {
    "primary": "#3B82F6",
    "primary-foreground": "#FFFFFF",
    "sidebar": {
      "DEFAULT": "#F9FAFB",
      "foreground": "#111827"
    }
  }
}
```

**Generated CSS variables:**

- `primary` → `--color-primary: #3B82F6`
- `primary-foreground` → `--color-primary-foreground: #FFFFFF`
- `sidebar.DEFAULT` → `--color-sidebar: #F9FAFB` (no `-default` suffix)
- `sidebar.foreground` → `--color-sidebar-foreground: #111827`

### Multi-theme (Dark/Light/Custom)

Add a `themes` key with named overrides. Each entry only needs values that differ from the default:

```json
{
  "colors": {
    "primary": "#3B82F6",
    "background": "#FFFFFF",
    "foreground": "#111827"
  },
  "themes": {
    "dark": {
      "colors": {
        "primary": "#60A5FA",
        "background": "#111827",
        "foreground": "#F9FAFB"
      },
      "shadows": { "sm": "0 1px 2px rgba(255,255,255,0.1)" }
    }
  }
}
```

**Generated CSS output (v3 mode):**

```css
:root {
  --color-primary: #3b82f6;
  --color-background: #ffffff;
  --color-foreground: #111827;
}

html[data-theme="dark"] {
  --color-primary: #60a5fa;
  --color-background: #111827;
  --color-foreground: #f9fafb;
  --shadow-sm: 0 1px 2px rgba(255, 255, 255, 0.1);
}
```

**Activate a theme:**

```html
<html data-theme="dark">
  ...
</html>
```

---

## 5. Development & CI

### Local (Pre-commit)

**Husky** + **lint-staged** run checks before every commit:

1. `eslint` & `prettier`
2. `tsc --noEmit`
3. `vitest run`

### Remote (GitHub Actions)

`lint` → `build:all` → `test`

---

## 6. Testing

```bash
yarn test          # Unit tests
yarn test:types    # Type tests (*.test-d.ts)
yarn test:coverage # Coverage report
```

---

## 7. Usage with Tailwind CSS v4

### Plugin file

```typescript
import {
  createStyleSystem,
  defineTheme,
  defineOptions,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "../styles/theme.json";

const theme = defineTheme(themeJson);

const options = defineOptions({
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  // safelistColors: true,  // include text-*/bg-*/border-* in safelist (default: false)
});

const { plugin, safelist, themeCss } = createStyleSystem(theme, options);

export default plugin;
export { safelist, themeCss };
```

### Import in CSS

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "../styles/safelist.txt";
```

### Optional: `@theme inline` for v4 auto-utilities

Write `themeCss` to a file to get `bg-primary`, `text-primary`, etc. without safelist:

```typescript
import fs from "node:fs";
const { themeCss } = createStyleSystem(theme, options);
fs.writeFileSync("styles/theme.css", themeCss);
```

```css
/* styles/globals.css */
@import "tailwindcss";
@import "./theme.css"; /* contains @theme inline { --color-primary: var(--sg-primary); ... } */
@plugin "./plugins/theme-plugin.ts";
```

---

## 8. Usage with Tailwind CSS v3

```typescript
import type { Config } from "tailwindcss";
import {
  createStylePlugin,
  defineTheme,
  Breakpoint,
} from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson);

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  plugins: [
    createStylePlugin(theme, {
      tailwindVersion: 3,
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG],
    }),
  ],
};

export default config;
```

---

## 9. Spacing — CSS Custom Properties

Spacing uses CSS custom properties instead of safelist, reducing class count from ~4,800 to 0.

```css
.sp-p {
  padding: var(--sp-p);
}
@media (min-width: 768px) {
  .sp-p {
    padding: var(--sp-p-md, var(--sp-p));
  }
}
```

### Usage in Components

```tsx
import { resolveSpacingProps } from "@duydpdev/style-generator";

const Box = ({ p, px, py, m, mx, my, className, children, ...rest }) => {
  const spacing = resolveSpacingProps({ p, px, py, m, mx, my });
  return (
    <div
      className={[...spacing.classNames, className].join(" ")}
      style={{ ...spacing.style, ...rest.style }}
    >
      {children}
    </div>
  );
};

<Box p={4} />
// → class="sp-p" style="--sp-p: 1rem"

<Box p={{ base: 2, md: 4, lg: 8 }} />
// → class="sp-p" style="--sp-p: 0.5rem; --sp-p-md: 1rem; --sp-p-lg: 2rem"
```

---

## 10. Options Reference

| Option                      | Type                       | Default                 | Description                                                     |
| :-------------------------- | :------------------------- | :---------------------- | :-------------------------------------------------------------- |
| `breakpoints`               | `(Breakpoint \| string)[]` | `["md", "lg"]`          | Breakpoints for responsive spacing and safelist.                |
| `screens`                   | `Record<string, string>`   | Tailwind defaults       | Custom screen widths.                                           |
| `safelistColors`            | `boolean`                  | `false`                 | Include `text-*`, `bg-*`, `border-*` color classes in safelist. |
| `tailwindVersion`           | `3 \| 4`                   | auto-detected           | Override Tailwind version detection.                            |
| `enableResponsive`          | `boolean`                  | `true`                  | Generate responsive spacing rules and safelist variants.        |
| `responsiveModules`         | `StyleModule[]`            | `["layout", "rounded"]` | Which modules get responsive prefixes.                          |
| `spacing.useMatchUtilities` | `boolean`                  | `false`                 | Enable JIT spacing (`sp-p-4`, `sp-p-[24px]`).                   |
| `typography.cssVarDriven`   | `boolean`                  | `false`                 | Drive typography utilities via CSS custom properties.           |

---

## 11. Exports API

| Function                | Description                                                              |
| :---------------------- | :----------------------------------------------------------------------- |
| `createStyleSystem`     | **Recommended**. Returns `{ plugin, safelist, themeCss, DesignTokens }`. |
| `createStylePlugin`     | Creates a Tailwind Plugin (v3/v4 auto-detected).                         |
| `generateSafelist`      | Generates `string[]` safelist (excludes spacing).                        |
| `generateThemeCss`      | Generates CSS string with `@theme inline` for Tailwind v4.               |
| `createDesignTokens`    | Generates typed design tokens for consumer apps.                         |
| `createVariantMapper`   | Helper for mapping tokens to CSS classes for CVA.                        |
| `resolveSpacingProps`   | Maps multiple spacing props to `{ classNames, style }`.                  |
| `defineTheme`           | Type-safe theme config helper. Zero runtime cost.                        |
| `defineOptions`         | Type-safe options helper. Zero runtime cost.                             |
| `detectTailwindVersion` | Auto-detect installed Tailwind CSS major version.                        |

---

## 12. `defineTheme()` — Type-safe Config

```typescript
import {
  defineTheme,
  defineOptions,
  createStyleSystem,
  Breakpoint,
} from "@duydpdev/style-generator";

const theme = defineTheme({
  colors: {
    primary: "#3B82F6",
    background: "#FFFFFF",
    foreground: "#111827",
    muted: "#6B7280",
  },
  typography: {
    heading: {
      fontSize: "32px",
      lineHeight: "120%",
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    body: {
      fontSize: "16px",
      lineHeight: "150%",
      fontWeight: 400,
      letterSpacing: "0px",
    },
  },
});

const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
});

const { plugin, safelist, themeCss } = createStyleSystem(theme, options);
```

**TS errors caught at compile time:**

```typescript
defineTheme({ colors: {} });
// Error: Property 'typography' is missing

defineTheme({ colors: {}, typography: { h1: { lineHeight: "1.2" } } });
// Error: Property 'fontSize' is missing in TypographyConfig
```

---

## 13. `generateThemeCss()` — Tailwind v4 Theme CSS

For Tailwind v4, `generateThemeCss()` outputs a CSS string that:

1. Defines `--sg-*` intermediate CSS variables in `:root`
2. Generates `[data-theme="name"]` override blocks
3. Maps `--sg-*` → Tailwind v4 namespaces via `@theme inline`

```typescript
import { generateThemeCss } from "@duydpdev/style-generator";
import theme from "./styles/theme.json";

const css = generateThemeCss(theme);
// Output:
// :root {
//   --sg-primary: #3B82F6;
//   --sg-background: #FFFFFF;
// }
//
// [data-theme="dark"] {
//   --sg-primary: #60A5FA;
// }
//
// @theme inline {
//   --color-primary: var(--sg-primary);
//   --color-background: var(--sg-background);
// }
```

When you include this CSS, Tailwind v4 automatically generates `bg-primary`, `text-primary`, `border-primary`, etc. — **no safelist needed for colors**.

---

## 14. Spacing — JIT Mode with `useMatchUtilities`

```typescript
const options = defineOptions({
  spacing: { enabled: true, useMatchUtilities: true },
});
```

```html
<div class="sp-p-4">padding: 1rem</div>
<div class="sp-p-[24px]">padding: 24px</div>
<div class="sp-p-2 md:sp-p-4 lg:sp-p-8">responsive padding</div>
```

---

## 15. Typography — CSS Custom Properties Mode

```typescript
const options = defineOptions({ typography: { cssVarDriven: true } });
```

```css
:root {
  --typography-heading-font-size: 32px;
  --typography-heading-font-weight: 700;
}
.heading {
  font-size: var(--typography-heading-font-size);
  font-weight: var(--typography-heading-font-weight);
}
```

---

## 16. TypeScript for Consumers

### Typed Design Tokens

```ts
import {
  createDesignTokens,
  createVariantMapper,
} from "@duydpdev/style-generator";
import { theme } from "./styles/theme";

const { DesignTokens } = createDesignTokens(theme, {
  breakpoints: ["md", "lg"],
});

// Use with CVA
const colorMap = createVariantMapper("bg", DesignTokens.Web.variantColor);
// { primary: "bg-primary", background: "bg-background", ... }
```

**Tokens in `DesignTokens.Web`:**

| Token                 | Description                      |
| --------------------- | -------------------------------- |
| `variantColor`        | All color keys (flat, camelCase) |
| `variantText`         | Keys of `typography`             |
| `variantShadow`       | Keys of `shadows`                |
| `variantBackdropBlur` | Keys of `backDropBlurs`          |
| `borderOption`        | Keys of `border`                 |
| `roundedOption`       | Keys of `borderRadius`           |
| `spacingProperties`   | List of spacing props            |
| `breakpoints`         | Active breakpoints               |

### Custom Breakpoints Intellisense

```ts
// types.ts
import { ResponsiveValue as LibResponsiveValue } from "@duydpdev/style-generator";

export type AppBreakpoints =
  | "base"
  | "mobile"
  | "tablet"
  | "laptop"
  | "desktop";
export type ResponsiveValue<T> = LibResponsiveValue<T, AppBreakpoints>;
```

---

## Migration from v1

If you're upgrading from v1, the main breaking change is the color structure:

```json
// v1 (old)
{
  "colors": {
    "base": { "primary": "#3B82F6" },
    "text": { "main": "#111827" },
    "common": { "border": "#E5E7EB" }
  }
}

// v2 (new) — flat
{
  "colors": {
    "primary": "#3B82F6",
    "main": "#111827",
    "border": "#E5E7EB"
  }
}
```

Options removed: `colorNamingMode`, `disableColorPrefix`, `enableCssVariables`.
Options added: `safelistColors`, `tailwindVersion`.
New return from `createStyleSystem`: `themeCss` string.

Run `npx style-gen doctor` to detect old format automatically.
