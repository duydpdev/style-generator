<script setup lang="ts">
import { computed } from "vue";

import { useStyleGuide } from "~/composables/useStyleGuide";

const { state } = useStyleGuide();

// Reactive <html data-*> — SSR renders the INITIAL values (matching
// nuxt.config head defaults), runtime toggles update the attributes live.
useHead({
  htmlAttrs: {
    "data-palette": computed(() => state.value.palette),
    "data-theme": computed(() => state.value.theme),
    "data-voice": computed(() => state.value.voice),
    "data-geometry": computed(() => state.value.geometry),
    "data-surface": computed(() => state.value.surface),
  },
});
</script>

<template>
  <NuxtPage />
</template>
