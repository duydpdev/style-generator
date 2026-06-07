<script setup lang="ts">
import { computed, ref } from "vue";

import Box from "~/components/Box.vue";
import Button from "~/components/Button.vue";
import { useStyleGuide } from "~/composables/useStyleGuide";
import { useDrawers } from "~/composables/useDrawers";
import { PALETTES } from "~/data/palettes";
import baseTheme from "~/theme/theme.json";

const { state } = useStyleGuide();
const { jsonOpen } = useDrawers();

const copied = ref(false);

const highlight = (json: string) =>
  json
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/("(\\.|[^"])*?")\s*:/g, '<span class="sg-json-k">$1</span>:')
    .replace(/:\s*("(\\.|[^"])*?")/g, ': <span class="sg-json-s">$1</span>')
    .replace(/:\s*(true|false|null)/g, ': <span class="sg-json-n">$1</span>')
    .replace(/:\s*(-?\d+\.?\d*)/g, ': <span class="sg-json-n">$1</span>');

const activeJson = computed(() => {
  const palette = state.value.palette;
  const colors = PALETTES[palette].light;
  const darkColors = PALETTES[palette].dark;
  const darkOverrides: Record<string, string> = {};
  (Object.keys(colors) as (keyof typeof colors)[]).forEach((k) => {
    if (darkColors[k] !== colors[k]) darkOverrides[k] = darkColors[k];
  });
  return JSON.stringify(
    {
      $palette: palette,
      colors,
      typography: baseTheme.typography,
      shadows: baseTheme.shadows,
      backDropBlurs: baseTheme.backDropBlurs,
      borderRadius: baseTheme.borderRadius,
      themes: {
        dark: {
          colors: darkOverrides,
          shadows: baseTheme.themes.dark.shadows,
        },
      },
    },
    null,
    2,
  );
});

const highlighted = computed(() => highlight(activeJson.value));

const copy = async () => {
  try {
    await navigator.clipboard.writeText(activeJson.value);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 1400);
  } catch {
    /* clipboard unavailable */
  }
};
</script>

<template>
  <aside
    class="sg-json-drawer sg-glass-target"
    :data-open="jsonOpen ? 'true' : 'false'"
    :aria-hidden="!jsonOpen"
  >
    <Box
      :px="6"
      :py="5"
      class="flex items-center justify-between border-b"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <h3
        class="sg-font-display m-0 text-[22px]"
        :style="{ color: 'var(--color-foreground)' }"
      >
        theme.json
      </h3>
      <Box :gap="1" class="flex">
        <Button variant="ghost" size="sm" @click="copy">
          {{ copied ? "Copied" : "Copy" }}
        </Button>
        <Button variant="ghost" size="sm" @click="jsonOpen = false">
          Close
        </Button>
      </Box>
    </Box>
    <div class="sg-json-body">
      <pre v-html="highlighted" />
    </div>
  </aside>
</template>
