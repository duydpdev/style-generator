# React + Tailwind v4 example

Demo app showing `@duydpdev/style-generator` with **Tailwind CSS v4** (`generate()` + `@theme inline`), Vite and React 19.

## Prerequisites

`package.json` depends on the library through `"@duydpdev/style-generator": "link:../.."`, so the library **must be built first**. The example is a Yarn workspace of the repo root, so the root install also installs it:

```bash
# From the repo root
yarn install
yarn build:all   # lib (dist/) + CLI (dist/cli/index.mjs, used by `yarn doctor`)
```

## Run the example

```bash
cd examples/react-v4
yarn dev          # Vite dev server on http://localhost:5173
```

`styleGenVite` (registered in `vite.config.ts`) writes `src/theme/theme.css` on dev start, on build and whenever `theme.json` changes. The file holds the full generated CSS (`:root` vars, `themeAxes` overrides, `@theme inline`, typography/spacing utilities, registry `@source inline` utility coverage) and is gitignored. `src/index.css` imports it right after `@import "tailwindcss"`.

## Scripts

| Script           | What it does                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `yarn dev`       | Vite dev server (HMR on `theme.json`)                                                                     |
| `yarn build`     | Production build via Vite                                                                                 |
| `yarn preview`   | Serve the production build                                                                                |
| `yarn typecheck` | `tsc --noEmit`                                                                                            |
| `yarn doctor`    | `node ../../dist/cli/index.mjs doctor`: checks `style-gen.config.json` and `src/theme/theme.json` in here |

## What it demonstrates

1. **Color tokens + theme toggle**: `bg-primary`, `bg-background`, etc. come from `@theme inline`. The toggles set `document.documentElement.dataset.theme` / `.dataset.palette` (plus `voice`, `geometry`, `surface`) and switch the library-generated `html[data-theme="dark"]` / `html[data-palette="..."]` overrides.
2. **Typography utilities**: `text-16-medium`, `text-32-bold`, … are emitted from `theme.typography` and used through `<Text type="text16Medium">`. The `type` prop is typed by `TextVariant<Theme>`; `color`, `decoration`, `align` and polymorphic `as` are the other props.
3. **Spacing helpers**: `<Box p={4} mx={{ base: 2, md: 4 }}>` calls `resolveSpacingProps` from `@duydpdev/style-generator/spacing`, which returns `.sp-*` class names plus inline `--sg-sp-*` CSS variables. `Box` also maps `backgroundColor`, `borderColor`, `border*`, `rounded*`, `shadow` and `backdropBlur` to token classes.
4. **CVA mapper + `cn()`**: `Box` and `Text` build their variants with `createVariantMapper(prefix, tokens)` from `@duydpdev/style-generator/cva`. `Button` is plain `cva` with `variant` (`fill`, `outline`, `soft`, `ghost`, `link`) × `color` (`primary`, `secondary`, `success`, `danger`) `compoundVariants` (20 combinations) and `size` (`sm`, `md`, `lg`). Final classes go through a shadcn-style `cn(clsx, twMerge)` helper.

> Multi-axis scope: `theme.json` declares `themeAxes.theme` (light/dark) and `themeAxes.palette` (cobalt/forest/sunset/mono), each toggled by its own `<html data-*>` attribute. The `dark × palette` compound overrides in `src/theme/palettes.css` stay hand-written CSS, since one `ThemeOverride` cannot target two axes at once. See the scope table in [`nuxt-v4`'s README](../nuxt-v4/README.md#multi-axis-theming-scope-themeaxes).

## Layout

Each reusable component lives in its own PascalCase folder: `<Name>.tsx` + `style.ts` (cva config) + `type.ts` (typed props) + `index.ts` (barrel).

```text
examples/react-v4
├── index.html
├── package.json
├── style-gen.config.json         # read by `yarn doctor` (theme + output paths)
├── tsconfig.json
├── vite.config.ts                # styleGenVite + @tailwindcss/vite
└── src/
    ├── main.tsx
    ├── App.tsx                   # page state (palette/theme/tweaks) + section composition
    ├── index.css                 # tailwindcss + theme.css + palettes.css + style-guide.css
    ├── lib/
    │   └── utils.ts              # cn() = twMerge(clsx(...))
    ├── components/
    │   ├── Box/                  # Box.tsx, style.ts, type.ts, index.ts: spacing + token props
    │   ├── Text/                 # Text.tsx, style.ts, type.ts, index.ts: type/color/decoration/align/as
    │   └── Button/               # Button.tsx, style.ts, type.ts, index.ts: variant × color compound variants
    ├── sections/                 # Topbar, Hero, Color, Typography, Utilities, ResponsiveSpacing, Button,
    │                             # Footer, JsonDrawer, TweaksPanel + SectionHead, palettes.ts, types.ts
    └── theme/
        ├── theme.json            # source of truth ("$schema" → theme.schema.json)
        ├── theme.schema.json     # JSON Schema for editor completion
        ├── theme.css             # generated by styleGenVite (gitignored)
        ├── design-tokens.ts      # createDesignTokens(theme.json) from the browser-safe /tokens subpath
        ├── palettes.css          # hand-written dark × palette overrides
        └── style-guide.css       # bespoke chrome (topbar, hero, drawers, tweaks)
```
