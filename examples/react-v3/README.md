# React + Tailwind v3 example

Same demo as `react-v4` but wired through Tailwind CSS **v3** via PostCSS and `tailwind.config.ts`.

## Prerequisites

Build the local library first (linked via `file:../..`):

```bash
# From repo root
yarn install
yarn build
```

## Run the example

```bash
cd examples/react-v3
npm install
npm run dev         # http://localhost:5173
```

## Scripts

| Script              | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Vite dev server                              |
| `npm run build`     | Production build via Vite + PostCSS Tailwind |
| `npm run preview`   | Serve the production build                   |
| `npm run typecheck` | `tsc --noEmit`                               |

## What's different from `react-v4`

| Concern             | v3                                                                                             | v4                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Plugin entry        | `tailwind.config.ts` → `createStyleSystem(theme, { tailwindVersion: 3 })` (plugin + safelist)  | `theme/theme-plugin.ts` consumed via CSS `@plugin` directive        |
| Color utilities     | `theme.extend.colors` populated by the lib with `var(--color-*)` refs                          | `@theme inline` block emitted by `themeCss`                         |
| Safelist            | `tailwind.config.ts#safelist` (lib injects color/typography/spacing classes — auto since v3.1) | `@source "./theme/safelist.txt"` reading a generated file           |
| CSS entry           | `@tailwind base; @tailwind components; @tailwind utilities;` in `index.css`                    | `@import "tailwindcss"` + `@import "./theme/theme.css"` + `@plugin` |
| Bundler integration | PostCSS + `tailwindcss@^3.4` + `autoprefixer`                                                  | `@tailwindcss/vite`                                                 |

Everything else — `cn()` + `extendTailwindMerge`, the `Box`/`Text`/`Button` folder layout, the `<Text>` cva config, `createVariantMapper` powered token mapping — is identical to `react-v4`.

## Component layout

```
examples/react-v3
├── index.html
├── package.json
├── postcss.config.cjs
├── tailwind.config.ts          # createStyleSystem(theme, options) → plugin + safelist
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css               # @tailwind base; components; utilities;
    ├── lib/utils.ts            # cn() with extendTailwindMerge
    ├── theme/
    │   ├── theme.json
    │   └── design-tokens.ts    # @duydpdev/style-generator/tokens
    ├── components/{Box,Text,Button}/{<Name>.tsx, style.ts, type.ts, index.ts}
    └── demos/{color,typography,spacing,cva}-demo.tsx
```

## v3 specific notes

- The plugin runs once when Tailwind loads `tailwind.config.ts`. `theme.extend.colors` is set to `var(--color-*)` references; the `:root` and `[data-theme="dark"]` blocks are injected via `addBase` inside the plugin handler.
- Tailwind v3 JIT only emits classes that appear in scanned content. `<Box p={4}>` builds `sp-p` at runtime — the scanner cannot see it. Since v3.1 the lib's `safelist` output includes every `sp-*` key automatically; no manual extension required.
- `safelistColors: true` is on so dynamic-looking color classes (`bg-${name}`) are also emitted.
