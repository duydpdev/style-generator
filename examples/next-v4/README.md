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

Next.js runs on webpack/turbopack, so the Vite-only `styleGenVite` plugin used by the React examples does not apply. Instead, `scripts/generate-theme.mjs` calls the same programmatic API and runs in a Node context:

- `app/theme/theme.css` — full generated CSS (`:root` vars, `@theme inline`, typography/spacing utilities)
- `app/theme/safelist.txt` — class safelist (consumed via `@source`)

It is chained into the `dev` / `build` scripts (`yarn generate:theme && …`) so the generated files always exist before Tailwind processes `globals.css`. (Yarn Berry does not honour `pre`/`post` script hooks, so the chaining is explicit rather than a `prebuild` hook.) Both generated files are gitignored.

## Scripts

| Script                | What it does                               |
| --------------------- | ------------------------------------------ |
| `yarn dev`            | `generate:theme &&` Next.js dev server     |
| `yarn build`          | `generate:theme &&` production build       |
| `yarn start`          | Serve the production build                 |
| `yarn typecheck`      | `tsc --noEmit` for source type-checking    |
| `yarn generate:theme` | Emit `theme.css` + `safelist.txt` manually |
| `yarn doctor`         | `style-gen doctor` config validation       |

## What it demonstrates

1. **Color tokens + theme toggle** — `bg-primary`, `bg-background`, etc. generated via `@theme inline`; toggling sets `document.documentElement.dataset.theme` and swaps `[data-theme="dark"]` overrides.
2. **Typography utilities** — `text-16-medium`, `text-32-bold` emitted from `theme.typography` and consumed by `<Text variant="body|heading">`.
3. **Spacing helpers** — `<Box p={4} mx={{ base: 2, md: 4 }}>` uses `resolveSpacingProps` from `@duydpdev/style-generator/spacing` to emit `.sp-*` classes + inline CSS variables. No safelist required for spacing.
4. **CVA mapper + `cn()`** — `<Button>` composes `class-variance-authority` with `createVariantMapper("bg", colors)` from `@duydpdev/style-generator/cva`. Final classes flow through a shadcn-style `cn(clsx, twMerge)` helper.

## Layout (App Router)

```
examples/next-v4
├── next.config.ts
├── postcss.config.mjs            # @tailwindcss/postcss
├── package.json                  # predev/prebuild → scripts/generate-theme.mjs
├── scripts/
│   └── generate-theme.mjs        # Node prebuild: generate()
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

The component layer is identical to `react-v4` — only the build wiring (App Router + prebuild script instead of Vite plugin) differs.
