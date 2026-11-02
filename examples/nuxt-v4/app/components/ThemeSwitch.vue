<script setup lang="ts">
import { axisAttributes } from "design-system-example";

import Button from "~/ui/Button.vue";
import Flex from "~/ui/Flex.vue";
import Stack from "~/ui/Stack.vue";
import Text from "~/ui/Text.vue";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

const state = useThemeAxes();

// `axisAttributes` yields `{ "data-theme": "dark", ... }` and nothing for a
// `"base"` axis; `useHead` applies the map to <html> and drops stale keys.
useHead(() => ({ htmlAttrs: axisAttributes(state.value) }));

const setTheme = (theme: ThemeName) => {
  state.value = { ...state.value, theme };
};
const setPalette = (palette: PaletteName) => {
  state.value = { ...state.value, palette };
};

const reset = () => {
  state.value = { theme: "base", palette: "base" };
};
</script>

<template>
  <Flex wrap align="end" :gap="4">
    <Stack role="group" aria-label="theme" :gap="1">
      <Text as="span" type="text12Mono" color="muted">theme</Text>
      <Flex wrap :gap="1">
        <Button
          v-for="name in THEMES"
          :key="name"
          size="sm"
          :variant="state.theme === name ? 'fill' : 'ghost'"
          :aria-pressed="state.theme === name"
          @click="setTheme(name)"
        >
          {{ name }}
        </Button>
      </Flex>
    </Stack>
    <Stack role="group" aria-label="palette" :gap="1">
      <Text as="span" type="text12Mono" color="muted">palette</Text>
      <Flex wrap :gap="1">
        <Button
          v-for="name in PALETTES"
          :key="name"
          size="sm"
          :variant="state.palette === name ? 'fill' : 'ghost'"
          :aria-pressed="state.palette === name"
          @click="setPalette(name)"
        >
          {{ name }}
        </Button>
      </Flex>
    </Stack>
    <Button variant="ghost" size="sm" @click="reset">Reset</Button>
  </Flex>
</template>
