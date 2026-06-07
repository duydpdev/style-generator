# Examples

Working consumer apps that link `@duydpdev/style-generator` via `file:../..` and exercise the public API end-to-end.

| Example                  | Stack                      | Highlights                                                       |
| ------------------------ | -------------------------- | ---------------------------------------------------------------- |
| [`react-v3`](./react-v3) | Vite + React + Tailwind v3 | `createStyleSystem()` → `tailwind.config.ts` (plugin + safelist) |
| [`react-v4`](./react-v4) | Vite + React + Tailwind v4 | `@plugin` + `@theme inline` via `@tailwindcss/vite`              |

Both apps share the same `Box`/`Text`/`Button` components, demo screens, and theme — only the Tailwind wiring differs.

## Prerequisites

Build the local library first (the examples consume `dist/` via `file:../..`):

```bash
# From repo root
yarn install
yarn build
```

## Run an example

```bash
cd examples/react-v3   # or react-v4
npm install
npm run dev
```

Each example exposes the same scripts: `dev`, `build`, `preview`, `typecheck`.

## Other files in this folder

`shadcn-theme.json`, `theme.json`, `tailwind.config.ts`, `v4-*`, `test-*.ts` are legacy snippets used during library development and are unrelated to the React examples above.
