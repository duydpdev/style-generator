<script setup lang="ts">
import {
  axisAttributes,
  buttonRecipe,
  cn,
  stackRecipe,
  textRecipe,
} from "design-system-example";

type AxesState = Parameters<typeof axisAttributes>[0];
type ThemeName = NonNullable<AxesState["theme"]>;
type PaletteName = NonNullable<AxesState["palette"]>;

const THEMES: readonly ThemeName[] = ["base", "dark", "highContrast"];
const PALETTES: readonly PaletteName[] = ["base", "forest", "sunset", "mono"];

const state = useThemeAxes();

// `axisAttributes` yields `{ "data-theme": "dark", ... }` and nothing for a
// `"base"` axis; `useHead` applies the map to <html> and drops stale keys.
useHead(() => ({ htmlAttrs: axisAttributes(state.value) }));

const row = cn(stackRecipe({ direction: "row", wrap: true }), "gap-4");
const field = cn(stackRecipe({ align: "start" }), "gap-1");
const label = textRecipe({ type: "text12Mono", color: "muted" });
const select = "rounded-md border border-current/20 bg-surface px-2 py-1";
const resetClass = buttonRecipe({ variant: "ghost", size: "sm" });

const reset = () => {
  state.value = { theme: "base", palette: "base" };
};
</script>

<template>
  <div :class="row">
    <label :class="field">
      <span :class="label">theme</span>
      <select v-model="state.theme" :class="select">
        <option v-for="name in THEMES" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </label>
    <label :class="field">
      <span :class="label">palette</span>
      <select v-model="state.palette" :class="select">
        <option v-for="name in PALETTES" :key="name" :value="name">
          {{ name }}
        </option>
      </select>
    </label>
    <button type="button" :class="resetClass" @click="reset">Reset</button>
  </div>
</template>
