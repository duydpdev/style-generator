# Next.js + Tailwind v4 example

Demo app showing `@duydpdev/style-generator` with **Next.js 15 (App Router)** and **Tailwind CSS v4** (`generate()` + `@theme inline`), React 19.

## Prerequisites

The example uses `workspace:*` to link the local copy of the library, so the lib **must be built first**:

```bash
# From the repo root
yarn install
yarn build
```

## Run the example

```bash
cd examples/next-v4
yarn install        # workspace link resolves from the repo root install
yarn dev            # starts Next.js dev server on http://localhost:3000
```

## How theme generation works (no Vite)

Next.js runs on webpack/Turbopack, so the Vite-only `styleGenVite` plugin used by the React/Nuxt examples does not apply. Instead, `next.config.ts` wraps the Next config in `styleGenNext` from `@duydpdev/style-generator/next`, which calls the same programmatic `generate()` API whenever Next evaluates the config:

- `app/theme/theme.css` — full generated CSS (`:root` vars, `@theme inline`, typography/spacing utilities, `@source inline` utility coverage)

`styleGenNext` does not import `next`, so it runs identically under both webpack (`next build`) and Turbopack (`next build --turbopack`). During `next dev` it also watches `theme.json` and re-writes `theme.css` on change. The generated file is gitignored.

## Scripts

| Script                   | What it does                                                              |
| ------------------------ | ------------------------------------------------------------------------- |
| `yarn dev`               | Next.js dev server (theme.css regenerated on config evaluation + watched) |
| `yarn build`             | Production build (webpack)                                                |
| `yarn build --turbopack` | Production build (Turbopack)                                              |
| `yarn start`             | Serve the production build                                                |
| `yarn typecheck`         | `tsc --noEmit` for source type-checking                                   |
| `yarn doctor`            | `style-gen doctor` config validation                                      |

## What it demonstrates

1. **Color tokens + theme toggle** — `bg-primary`, `bg-background`, etc. generated via `@theme inline`; toggling sets `document.documentElement.dataset.theme` and swaps `[data-theme="dark"]` overrides.
2. **Typography utilities** — `text-16-medium`, `text-32-bold` emitted from `theme.typography` and consumed by `<Text variant="body|heading">`.
3. **Spacing helpers** — `<Box p={4} mx={{ base: 2, md: 4 }}>` uses `resolveSpacingProps` from `@duydpdev/style-generator/spacing` to emit `.sp-*` classes + inline CSS variables. No safelist required for spacing.
4. **CVA mapper + `cn()`** — `<Button>` composes `class-variance-authority` with `createVariantMapper("bg", colors)` from `@duydpdev/style-generator/cva`. Final classes flow through a shadcn-style `cn(clsx, twMerge)` helper.

## Layout (App Router)

```
examples/next-v4
├── next.config.ts                # wraps nextConfig in styleGenNext (writes theme.css)
├── postcss.config.mjs            # @tailwindcss/postcss
├── package.json
└── app/
    ├── layout.tsx                # <html data-*> defaults + Google Fonts
    ├── page.tsx                  # renders <StyleGuide/>
    ├── StyleGuide.tsx            # "use client" state container (palette/theme/tweaks)
    ├── globals.css               # tailwind + theme.css + palettes + style-guide + @source
    ├── lib/
    │   └── utils.ts              # cn() = twMerge(clsx(...))
    ├── components/               # Box / Text / Button (shared with react-v4)
    ├── sections/                 # Hero / Color / Typography / Utilities / ... demo screens
    └── theme/
        ├── theme.json
        ├── design-tokens.ts      # App-side DesignTokens via /tokens subpath (browser-safe)
        ├── palettes.css          # runtime --sg-* palette overrides
        └── style-guide.css       # bespoke chrome (topbar, hero, drawers, tweaks)
```

The component layer is identical to `react-v4` — only the build wiring (App Router + `styleGenNext` in `next.config.ts` instead of the Vite plugin) differs.
