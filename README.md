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

This creates your `theme.json` and plugin file with the correct boilerplate.

### Step 2. Edit theme

Open `styles/theme.json` and customize your design tokens. The color system supports a **Hybrid Theme** with 3 root buckets: `base`, `text`, and `common`.

```json
{
  "colors": {
    "base": {
      "primary": {
        "DEFAULT": "#3B82F6",
        "500": "#3B82F6",
        "900": "#1E3A8A"
      },
      "background": "#FFFFFF"
    },
    "text": {
      "main": "#111827",
      "muted": "#6B7280"
    },
    "common": {
      "border": "#E5E7EB"
    }
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

Run this whenever you update your theme to refresh the safelist.

> **Tip:** Use `--watch` mode during development:
>
> ```bash
> npx style-gen safelist --watch
> ```
>
> The safelist auto-regenerates whenever `theme.json` changes.

### Step 4. Import in CSS (Tailwind v4)

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "../styles/safelist.txt";
```

### Step 5. Start developing

Start your dev server. Your design tokens are now available as Tailwind utilities!

---

## 3. CLI Reference

### Global usage

```bash
npx style-gen <command> [options]
```

### Commands

#### `style-gen init`

Scaffold project files (theme config + plugin file).

```bash
npx style-gen init                    # Interactive mode (prompts)
npx style-gen init --tw v4 --dark     # Non-interactive mode (flags)
```

| Flag       | Type      | Default                   | Description                     |
| :--------- | :-------- | :------------------------ | :------------------------------ |
| `--tw`     | `string`  | —                         | Tailwind version (`v3` or `v4`) |
| `--theme`  | `string`  | `styles/theme.json`       | Path to theme config file       |
| `--plugin` | `string`  | `plugins/theme-plugin.ts` | Path to plugin file             |
| `--dark`   | `boolean` | `false`                   | Include dark mode template      |

> **CI/Non-interactive mode**: When `stdin` is not a TTY (e.g. in CI), prompts are skipped and flags are required.

#### `style-gen safelist`

Generate `safelist.txt` from theme config.

```bash
npx style-gen safelist                          # Default paths
npx style-gen safelist --theme ./theme.json     # Custom theme path
npx style-gen safelist --out ./safelist.txt     # Custom output path
npx style-gen safelist --watch                  # Watch mode
```

| Flag            | Type      | Default               | Description                                      |
| :-------------- | :-------- | :-------------------- | :----------------------------------------------- |
| `--theme`       | `string`  | `styles/theme.json`   | Path to theme JSON file                          |
| `--out`         | `string`  | `styles/safelist.txt` | Path to output safelist file                     |
| `-w`, `--watch` | `boolean` | `false`               | Watch theme file for changes and auto-regenerate |

#### `style-gen doctor`

Check project setup, validate configuration, and verify theme schema.

```bash
npx style-gen doctor
```

The doctor will check:

- Is `style-gen.config.json` present?
- Does the theme file exist and contain valid JSON?
- Are the required schema keys (`colors`, `typography`) present in the theme?
- Do the plugin and output files exist?

#### Global Flags

- `-v`, `--version`: Display the current version of the CLI.
- `-h`, `--help`: Display CLI usage help.

### Configuration file

The CLI supports an optional `style-gen.config.json` in your project root:

```json
{
  "theme": "styles/theme.json",
  "output": "styles/safelist.txt",
  "plugin": "plugins/theme-plugin.ts",
  "breakpoints": ["md", "lg"],
  "responsiveModules": ["layout", "rounded"],
  "screens": { "md": "800px" }
}
```

**Config resolution order** (highest priority first):

1. CLI flags (`--theme`, `--out`, etc.)
2. `style-gen.config.json`
3. `package.json` → `"style-gen"` field
4. Built-in defaults

---

## 4. Theme Config

Create a `theme.json` file with your design tokens. The color system supports a **Hybrid Theme** with 3 root buckets: `base`, `text`, and `common`.

### Nested Colors & `DEFAULT` key

You can use nested objects to organize your colors. Use the `DEFAULT` key to define the base color for a group without adding a suffix to the CSS variable.

```json
{
  "colors": {
    "base": {
      "primary": {
        "DEFAULT": "#3B82F6",
        "50": "#EFF6FF",
        "500": "#3B82F6",
        "900": "#1E3A8A"
      },
      "background": "#FFFFFF"
    },
    "text": {
      "main": "#111827",
      "muted": "#6B7280"
    },
    "common": {
      "border": "#E5E7EB"
    }
  }
}
```

**Auto-generated CSS Variables:**

- `primary.DEFAULT` → `--color-base-primary: #3B82F6` (no `-default` suffix)
- `primary.500` → `--color-base-primary-500: #3B82F6`
- `text.main` → `--color-text-main: #111827`

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

## 5. Development & CI

This project uses a 2-layer CI/CD system to ensure code quality:

### Local (Pre-commit)

We use **Husky** and **lint-staged** to run checks before every commit:

1. `eslint` & `prettier`
2. `tsc --noEmit` (TypeScript check)
3. `vitest run` (Unit tests)

### Remote (GitHub Actions)

On every push or PR to `main`/`develop`, the CI pipeline runs:
`lint` → `build:all` → `test`

---

## 6. Testing

### Unit Tests

Run unit tests with Vitest:

```bash
yarn test
```

### Type Testing

We use **Vitest Typecheck** to ensure Design Tokens map correctly from your theme configuration:

```bash
yarn test:types
```

---

## 7. Usage with Tailwind CSS v4

### Step 1: Create Plugin File

(_If you used `npx style-gen init`, this is already done for you!_)

```typescript
import { createStyleSystem, defineTheme, defineOptions, Breakpoint } from "@duydpdev/style-generator";
import themeJson from "../styles/theme.json";

const theme = defineTheme(themeJson); // type-checked at compile time

const options = defineOptions({
  screens: { md: "800px" },
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  colorNamingMode: "v3", // "v3" | "v4" | "flat"
});

const { plugin, safelist } = createStyleSystem(theme, options);

// Export plugin for Tailwind v4
export default plugin;

// Safelist generation is managed by: npx style-gen safelist
export { safelist };
```

### Step 2: Import in CSS

```css
@import "tailwindcss";
@plugin "./plugins/theme-plugin.ts";
@source "../styles/safelist.txt";
```

---

## 8. Usage with Tailwind CSS v3

```typescript
import type { Config } from "tailwindcss";
import { createStylePlugin, defineTheme, Breakpoint } from "@duydpdev/style-generator";
import themeJson from "./theme.json";

const theme = defineTheme(themeJson);

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  plugins: [
    createStylePlugin(theme, {
      screens: { md: "800px" },
      breakpoints: [Breakpoint.MD, Breakpoint.LG],
      colorNamingMode: "v3",
    }),
  ],
};

export default config;
```

---

## 9. Spacing — CSS Custom Properties

Spacing uses CSS custom properties instead of safelist, reducing class count from **~4,800 to 0**.

The plugin generates fixed `.sp-*` utility classes with `var()` fallback chains:

```css
/* Base */
.sp-p {
  padding: var(--sp-p);
}

/* Responsive (mobile-first) */
@media (min-width: 768px) {
  .sp-p {
    padding: var(--sp-p-md, var(--sp-p));
  }
}
```

### Usage in Components

Use the `resolveSpacingProps` helper:

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

## 10. Options Reference

| Option                        | Type                       | Default                 | Description                                                      |
| :---------------------------- | :------------------------- | :---------------------- | :--------------------------------------------------------------- |
| `breakpoints`                 | `(Breakpoint \| string)[]` | `["md", "lg"]`          | Breakpoints for responsive spacing and safelist.                 |
| `screens`                     | `Record<string, string>`   | Tailwind defaults       | Custom screen widths.                                            |
| `enableCssVariables`          | `boolean`                  | `true`                  | Generate `:root` / `html[data-theme]` CSS variables.             |
| `colorNamingMode`             | `"v3" \| "v4" \| "flat"`  | `"v3"`                  | CSS variable naming convention for colors. See section 13.       |
| `enableResponsive`            | `boolean`                  | `true`                  | Generate responsive spacing rules and safelist variants.         |
| `responsiveModules`           | `StyleModule[]`            | `["layout", "rounded"]` | Which modules get responsive prefixes.                           |
| `spacing.useMatchUtilities`   | `boolean`                  | `false`                 | Enable JIT spacing (`sp-p-4`, `sp-p-[24px]`). See section 14.   |
| `typography.cssVarDriven`     | `boolean`                  | `false`                 | Drive typography utilities via CSS custom properties. See sec 15. |
| ~~`disableColorPrefix`~~      | `boolean`                  | `false`                 | **Deprecated.** Use `colorNamingMode: "flat"` instead.           |

---

## 11. Exports API

| Function              | Description                                             |
| :-------------------- | :------------------------------------------------------ |
| `createStyleSystem`   | **Recommended**. Returns `{ plugin, safelist }`.        |
| `createStylePlugin`   | Creates a Tailwind Plugin (v3/v4).                      |
| `generateSafelist`    | Generates `string[]` safelist (excludes spacing).       |
| `createDesignTokens`  | Generates typed design tokens for consumer apps.        |
| `createVariantMapper` | Helper for mapping tokens to CSS classes for CVA.       |
| `resolveSpacingProps` | Maps multiple spacing props to `{ classNames, style }`. |
| `defineTheme`         | Type-safe theme config helper. Zero runtime cost.       |
| `defineOptions`       | Type-safe options helper. Zero runtime cost.            |

---

---

## 12. `defineTheme()` — Type-safe Config

Use `defineTheme()` and `defineOptions()` to catch typos and missing fields **at edit time** with zero runtime cost.

```typescript
import {
  defineTheme,
  defineOptions,
  createStyleSystem,
  Breakpoint,
} from "@duydpdev/style-generator";

// TypeScript will error immediately if required fields are missing or mistyped
const theme = defineTheme({
  colors: {
    base: { primary: "#3B82F6", background: "#FFFFFF" },
    text: { main: "#111827", muted: "#6B7280" },
  },
  typography: {
    heading: { fontSize: "32px", lineHeight: "120%", fontWeight: 700, letterSpacing: "-0.02em" },
    body: { fontSize: "16px", lineHeight: "150%", fontWeight: 400, letterSpacing: "0px" },
  },
});

const options = defineOptions({
  breakpoints: [Breakpoint.MD, Breakpoint.LG],
  colorNamingMode: "v3",
});

const { plugin, safelist } = createStyleSystem(theme, options);
```

**TS errors caught at compile time:**

```typescript
defineTheme({ colors: {} });
// Error: Property 'typography' is missing

defineTheme({
  colors: {},
  typography: { h1: { lineHeight: "1.2" } },
  // Error: Property 'fontSize' is missing in TypographyConfig
});
```

> These are identity functions — no runtime overhead. They exist purely to activate TypeScript inference.

---

## 13. `colorNamingMode` — CSS Variable Naming

Controls how color namespaces are mapped to CSS variable names. Replaces the deprecated `disableColorPrefix` flag.

| Mode       | `base.primary`          | `text.muted`            | `common.accent`          |
| :--------- | :---------------------- | :---------------------- | :----------------------- |
| `"v3"` (default) | `--color-base-primary`  | `--color-text-muted`    | `--color-common-accent`  |
| `"v4"`     | `--color-primary`       | `--color-text-muted`    | `--color-accent`         |
| `"flat"`   | `--color-primary`       | `--color-muted`         | `--color-accent`         |

```typescript
// v3 (default) — namespaced, explicit
createStylePlugin(theme, { colorNamingMode: "v3" });
// :root { --color-base-primary: ...; --color-text-muted: ...; }

// v4 — base + common flattened, text keeps prefix (Tailwind v4 auto-detects --color-*)
createStylePlugin(theme, { colorNamingMode: "v4" });
// :root { --color-primary: ...; --color-text-muted: ...; }

// flat — all namespaces removed (same as old disableColorPrefix: true)
createStylePlugin(theme, { colorNamingMode: "flat" });
// :root { --color-primary: ...; --color-muted: ...; }
```

> `disableColorPrefix: true` is deprecated but still works — it maps internally to `colorNamingMode: "flat"`.

---

## 14. Spacing — JIT Mode with `useMatchUtilities`

The library supports **two independent spacing modes** that work in parallel:

| Mode | API | Use case | Responsive | Safelist? |
| :--- | :-- | :------- | :--------- | :-------- |
| **Static** (default) | `resolveSpacingProps()` → `className="sp-p"` + inline `style` | React components | Via CSS var chain `--tw-sp-p` | No |
| **JIT** (opt-in) | Write `sp-p-4` or `sp-p-[24px]` directly in templates | HTML / JSX templates | Via Tailwind `md:sp-p-8` | No |

Enable JIT mode by adding `spacing.useMatchUtilities: true`:

```typescript
const options = defineOptions({
  spacing: {
    enabled: true,
    useMatchUtilities: true, // adds JIT on top of static .sp-p classes
  },
});
```

**JIT usage in templates:**

```html
<!-- Tailwind scale values -->
<div class="sp-p-4">padding: 1rem</div>
<div class="sp-mx-8">margin-left/right: 2rem</div>

<!-- Arbitrary values -->
<div class="sp-p-[24px]">padding: 24px</div>
<div class="sp-gap-[1.5rem]">gap: 1.5rem</div>

<!-- Responsive via Tailwind prefixes -->
<div class="sp-p-2 md:sp-p-4 lg:sp-p-8">responsive padding</div>
```

> Static `.sp-p` and JIT `sp-p-4` do **not conflict** — they use different CSS mechanisms. Choose the mode that fits your component model.

---

## 15. Typography — CSS Custom Properties Mode

By default, typography utilities use hard-coded values. Enable `typography.cssVarDriven: true` to inject tokens as CSS variables and have utilities reference them — enabling runtime overrides via CSS.

```typescript
const options = defineOptions({
  typography: { cssVarDriven: true },
});
```

**Output when `cssVarDriven: true`:**

```css
/* Tokens injected into :root */
:root {
  --typography-heading-font-size: 32px;
  --typography-heading-line-height: 120%;
  --typography-heading-font-weight: 700;
  --typography-heading-letter-spacing: -0.02em;
}

/* Utilities reference vars instead of hard-coded values */
.heading {
  font-size: var(--typography-heading-font-size);
  line-height: var(--typography-heading-line-height);
  font-weight: var(--typography-heading-font-weight);
  letter-spacing: var(--typography-heading-letter-spacing);
}
```

**Consumer override — no JS changes needed:**

```css
/* Override a single token for a specific context */
.marketing-hero {
  --typography-heading-font-size: 48px;
}
```

> When `cssVarDriven: false` (default), utilities use hard-coded values directly — same behavior as before.

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
// colorMap will have keys like "primary", "primary-500", "text-main"
```

### Custom Breakpoints Intellisense

If you are using custom breakpoints (e.g. `tablet`, `desktop`) in your Tailwind config, you can wrap the \`ResponsiveValue\` type to get full IDE intellisense across your project components:

```ts
// types.ts
import { ResponsiveValue as LibResponsiveValue } from "@duydpdev/style-generator";

// Define your project's custom breakpoints
export type AppBreakpoints =
  | "base"
  | "mobile"
  | "tablet"
  | "laptop"
  | "desktop";

// Export the wrapped type for your components to use
export type ResponsiveValue<T> = LibResponsiveValue<T, AppBreakpoints>;
```

Then use this local \`ResponsiveValue\` type in your components (like \`Box\`, \`Flex\`) instead of importing it directly from the library. This ensures VSCode automatically suggests all your custom keys when passing \`p={{ ... }}\`.
