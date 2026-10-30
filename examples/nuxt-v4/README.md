# Nuxt + Tailwind v4 example

Thin Nuxt 4 app over the shared [`design-system`](../design-system/README.md) package: wiring (`nuxt.config.ts`, CSS entry) plus one Nuxt-specific component, `ThemeSwitch.vue`.
The multi-axis scope table lives in the [design-system README](../design-system/README.md#theme-axes); run with `yarn dev` after `yarn install && yarn build:all` from the repo root (Node >= 22.18).

## Components

The app renders [`packages/ui-vue`](../../packages/ui-vue) components (`@duydpdev/ui-vue`), created once in `app/ui.ts` with `createUi(tokens, presets)`; it passes the full design-system presets because the app renders every role. Components are imported explicitly from `~/ui` (no Nuxt auto-import), and app code has no class strings: every style is a component prop, typed by the theme's tokens.

Linting this app needs `yarn build:all && yarn workspace nuxt-v4-example prepare:nuxt` first, because the type-aware rules read `.nuxt/tsconfig.*.json`.
