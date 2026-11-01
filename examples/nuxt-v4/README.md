# Nuxt + Tailwind v4 example

Thin Nuxt 4 app over the shared [`design-system`](../design-system/README.md) package: wiring (`nuxt.config.ts`, CSS entry), the six sample components in `app/ui/` and one Nuxt-specific component, `ThemeSwitch.vue`.
The multi-axis scope table lives in the [design-system README](../design-system/README.md#theme-axes); run with `yarn dev` after `yarn install && yarn build:all` from the repo root (Node >= 22.18).

## Components

`app/ui/` holds six single-file components, `Box`, `Text`, `Stack`, `Flex`, `Grid` and `Button`, each a `<script setup lang="ts">` SFC with typed `defineProps`, `defineEmits` and `defineSlots` over the `design-system` recipes. They are example code, not a package: copy the folder. Nuxt auto-registers only `app/components/`, so pages import each one explicitly (`import Box from "~/ui/Box.vue"`). App code has no class or style attributes: every style is a component prop, typed by the theme's tokens, and props are written in camelCase (`:maxWidth`, `:gapX`).

`yarn workspace nuxt-v4-example typecheck` checks their prop types through the type test `tests/nuxt/ui-props.vue` (every `@vue-expect-error` must be consumed). It needs `yarn build:all` first. There is no test runner: lint, typecheck and `nuxt build` are the checks.

Linting this app needs `yarn build:all && yarn workspace nuxt-v4-example prepare:nuxt` first, because the type-aware rules read `.nuxt/tsconfig.*.json`.
