# React + Tailwind v4 example

Demo app showing `@duydpdev/style-generator` with **Tailwind CSS v4** (`@plugin` + `@theme inline`), Vite, and React 19.

## Prerequisites

The example uses `"file:../.."` to link the local copy of the library, so the lib **must be built first**:

```bash
# From the repo root
yarn install
yarn build
```

## Run the example

```bash
cd examples/react-v4
npm install        # or yarn install
npm run dev        # starts Vite dev server on http://localhost:5173
```

`styleGenVite` (registered in `vite.config.ts`) emits the following on dev start, build, and whenever `theme.json` changes:

- `src/theme/theme.css` — `@theme inline` block (consumed by Tailwind v4)
- `src/theme/safelist.txt` — class safelist (consumed via `@source`)

Both generated files are gitignored.

## Scripts

| Script              | What it does                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev server (HMR on `theme.json`)   |
| `npm run build`     | Production build via Vite               |
| `npm run preview`   | Serve the production build              |
| `npm run typecheck` | `tsc --noEmit` for source type-checking |
| `npm run doctor`    | `style-gen doctor` config validation    |

## What it demonstrates

1. **Color tokens + theme toggle** — `bg-primary`, `bg-background`, etc. generated via `@theme inline`; toggling sets `document.documentElement.dataset.theme` and swaps `[data-theme="dark"]` overrides.
2. **Typography utilities** — `text-16-medium`, `text-32-bold` emitted from `theme.typography` and consumed by `<Text variant="body|heading">`.
3. **Spacing helpers** — `<Box p={4} mx={{ base: 2, md: 4 }}>` uses `resolveSpacingProps` from `@duydpdev/style-generator/spacing` to emit `.sp-*` classes + inline CSS variables. No safelist required for spacing.
4. **CVA mapper + `cn()`** — `<Button>` composes `class-variance-authority` with `createVariantMapper("bg", colors)` from `@duydpdev/style-generator/cva`. Final classes flow through a shadcn-style `cn(clsx, twMerge)` helper.

## Component layout (template-lib style)

Each reusable component lives in its own PascalCase folder with `<Name>.tsx` + `style.ts` (cva config) + `type.ts` (typed props) + `index.ts` (barrel):

```
examples/react-v4
├── index.html
├── package.json
├── vite.config.ts                # registers styleGenVite + @tailwindcss/vite
└── src/
    ├── App.tsx                   # header + theme toggle, composed of Box/Text/Button
    ├── main.tsx
    ├── index.css                 # Tailwind + plugin entry
    ├── lib/
    │   └── utils.ts              # cn() = twMerge(clsx(...))
    ├── components/
    │   ├── Box/
    │   │   ├── Box.tsx           # Box primitive — typed design-token props (bg, border, rounded, shadow…)
    │   │   ├── style.ts          # cva config — variants fed by createVariantMapper for every token category
    │   │   ├── type.ts           # SpacingProperties + StyleProperties + BoxProps
    │   │   └── index.ts
    │   ├── Text/
    │   │   ├── Text.tsx          # Typography wrapper, polymorphic as= prop
    │   │   ├── style.ts          # cva: type (variantText) + color + decoration + align
    │   │   ├── type.ts
    │   │   └── index.ts
    │   └── Button/
    │       ├── Button.tsx        # cva + cn + compoundVariants matrix
    │       ├── style.ts          # variant × color compoundVariants
    │       ├── type.ts
    │       └── index.ts
    ├── demos/
    │   ├── color-demo.tsx
    │   ├── typography-demo.tsx
    │   ├── spacing-demo.tsx
    │   └── cva-demo.tsx
    └── theme/
        ├── theme.json
        ├── theme-plugin.ts       # Tailwind @plugin entry — runs in plugin loader, exports plugin default
        └── design-tokens.ts      # App-side DesignTokens via /tokens subpath (browser-safe)
```

### Why split `theme-plugin.ts` and `design-tokens.ts`?

The root barrel `@duydpdev/style-generator` (used by `createStyleSystem`) pulls in `detectTailwindVersion`, which uses `node:module`. Vite cannot bundle that for the browser. So:

- `theme-plugin.ts` (Tailwind-only, loaded by `@plugin` directive in CSS) keeps using the full barrel.
- `design-tokens.ts` imports from the `/tokens` subpath which is browser-safe and contains only `createDesignTokens` + its deps.

App code imports `DesignTokens` from `design-tokens.ts` — never from `theme-plugin.ts`.
