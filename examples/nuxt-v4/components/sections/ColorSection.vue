<script setup lang="ts">
import { computed } from "vue";

import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import SectionHead from "~/components/sections/SectionHead.vue";
import { useStyleGuide } from "~/composables/useStyleGuide";
import { COLOR_ROWS, PALETTES } from "~/data/palettes";

const { state } = useStyleGuide();

const set = computed(() => PALETTES[state.value.palette][state.value.theme]);
</script>

<template>
  <section class="border-t py-14" :style="{ borderColor: 'var(--c-line)' }">
    <SectionHead num="01 — Color" title="A four-role palette.">
      <template #desc>
        Each token resolves at runtime via <code>--color-*</code> custom
        properties. Toggle the theme to flip every swatch to its dark
        counterpart without remounting a single component.
      </template>
    </SectionHead>

    <Box class="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Box
        v-for="row in COLOR_ROWS"
        :key="row.key"
        background-color="surface"
        rounded="lg"
        class="sg-color-card sg-glass-target overflow-hidden border"
        :style="{ borderColor: 'var(--c-line)' }"
      >
        <div
          class="relative h-24"
          :style="{ background: `var(--color-${row.key})` }"
        >
          <div class="sg-tone-strip">
            <span :style="{ background: set[row.key], opacity: 0.55 }" />
            <span :style="{ background: set[row.key], opacity: 0.75 }" />
            <span :style="{ background: set[row.key] }" />
          </div>
        </div>
        <Box :px="4" :py="3" :gap="1" class="flex flex-col">
          <Text type="text14Regular" class="font-medium">{{ row.label }}</Text>
          <Text type="text12Mono" color="muted">--color-{{ row.key }}</Text>
          <Text type="text12Mono" color="muted">
            {{ row.desc }} · {{ set[row.key].toUpperCase() }}
          </Text>
        </Box>
      </Box>
    </Box>
  </section>
</template>
