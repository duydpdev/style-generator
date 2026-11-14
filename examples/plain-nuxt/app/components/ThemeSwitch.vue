<script setup lang="ts">
import { themeAxisAttributes } from "@duydpdev/style-generator/recipes";

import type { ThemeAxesState } from "~/theme/theme.tokens";
import Button from "~/ui/button/Button.vue";

const DARK_STATE: ThemeAxesState = { theme: "dark" };
const DARK = themeAxisAttributes(DARK_STATE);

// SSR-safe state: the server and the client start light, so the <html>
// attributes match across hydration; useHead drops stale keys.
const dark = useState<boolean>("dark-mode", () => false);
useHead(() => ({ htmlAttrs: dark.value ? DARK : {} }));

const toggle = () => {
  dark.value = !dark.value;
};
</script>

<template>
  <Button variant="ghost" size="sm" :aria-pressed="dark" @click="toggle">
    Dark mode
  </Button>
</template>
