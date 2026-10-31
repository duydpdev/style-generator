<script setup lang="ts">
import { axisAttributes } from "design-system-example";

import { Button, Flex, Select, Stack, Text } from "~/ui";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

const state = useThemeAxes();

// `axisAttributes` yields `{ "data-theme": "dark", ... }` and nothing for a
// `"base"` axis; `useHead` applies the map to <html> and drops stale keys.
useHead(() => ({ htmlAttrs: axisAttributes(state.value) }));

const setTheme = (value: string) => {
  state.value = { ...state.value, theme: value as ThemeName };
};
const setPalette = (value: string) => {
  state.value = { ...state.value, palette: value as PaletteName };
};

const reset = () => {
  state.value = { theme: "base", palette: "base" };
};
</script>

<template>
  <Flex wrap :gap="4">
    <Stack as="label" align="start" :gap="1">
      <Text as="span" type="text12Mono" color="muted">theme</Text>
      <Select size="sm" :modelValue="state.theme" @update:modelValue="setTheme">
        <option v-for="name in THEMES" :key="name" :value="name">
          {{ name }}
        </option>
      </Select>
    </Stack>
    <Stack as="label" align="start" :gap="1">
      <Text as="span" type="text12Mono" color="muted">palette</Text>
      <Select
        size="sm"
        :modelValue="state.palette"
        @update:modelValue="setPalette"
      >
        <option v-for="name in PALETTES" :key="name" :value="name">
          {{ name }}
        </option>
      </Select>
    </Stack>
    <Button variant="ghost" size="sm" @click="reset">Reset</Button>
  </Flex>
</template>
