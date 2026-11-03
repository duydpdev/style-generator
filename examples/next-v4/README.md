# Next.js + Tailwind v4 example (plain)

Next.js 16 (App Router, React 19) app that renders a landing page built from plain, copy-paste components. CI type-checks and builds it, making it the working reference for the [Next.js tutorial](../../documents/getting-started/next.md). The files in `src/ui`, `src/sections` and `src/App.tsx` are copies of `examples/plain-react`, and `yarn check:plain-ui` keeps `style.ts` and `types.ts` identical.

## Prerequisites

```bash
# From the repo root
yarn install
yarn build:all   # lib (dist/) + CLI (dist/cli/index.mjs)
```

Upgrading an older checkout: delete the root `app/` folder once with `rm -rf examples/next-v4/app` (Next prefers it over `src/app`, and `next.config.ts` throws while it exists).

## Run the example

```bash
cd examples/next-v4
yarn dev
```

## Copy a component

1. Install the package and the libraries a copied folder uses:
   ```bash
   yarn add @duydpdev/style-generator@^5.3.0 class-variance-authority clsx tailwind-merge
   ```
   `@duydpdev/style-generator` comes from GitHub Packages, so set up the `@duydpdev` scope registry and a personal access token first (see the [Install](../../README.md#install) section of the repository README); without the scope config npmjs serves an unrelated `3.0.0`.
2. Wire `theme.css` for Next.js: wrap your config in `styleGenNext` (`next.config.ts`) and import `@import "tailwindcss";` and `@import "./theme/theme.css";` in `src/app/globals.css`. See the [Next.js tutorial](../../documents/getting-started/next.md).
3. Copy `src/theme/theme.json` (or use your own theme) and `src/theme.ts`. If you pass generator options to `styleGenNext`, pass the same object to `createDesignTokens` in `theme.ts`.
4. Copy one component folder from `src/ui/`, for example `src/ui/button/`. A folder imports only its own files, `../../theme` and the packages, so nothing else comes with it. See [Components](../../documents/components.md#plain-examples-copy-these).

## Scripts

| Script           | What it does                                                    |
| ---------------- | --------------------------------------------------------------- |
| `yarn dev`       | Next.js dev server (theme.css regenerated on config evaluation) |
| `yarn build`     | Production build (Turbopack, the Next 16 default)               |
| `yarn start`     | Serve the production build                                      |
| `yarn typecheck` | `tsc --noEmit`                                                  |

## Layout

```text
examples/next-v4
├── next.config.ts
├── postcss.config.mjs
├── package.json
├── tsconfig.json
└── src/
    ├── theme/
    │   ├── theme.json
    │   └── theme.css (generated, gitignored)
    ├── theme.ts
    ├── ui/
    │   └── <folder>/
    │       ├── style.ts
    │       ├── types.ts
    │       ├── <Name>.tsx
    │       └── index.ts
    ├── sections/
    ├── App.tsx
    ├── ThemeSwitch.tsx ("use client")
    └── app/
        ├── layout.tsx
        ├── page.tsx
        └── globals.css
```
