<script setup lang="ts">
import Box from "~/components/Box.vue";

defineProps<{ num: string; title: string }>();
</script>

<template>
  <Box class="mb-9 flex flex-wrap items-baseline justify-between gap-6">
    <Box>
      <span class="sg-section-num">{{ num }}</span>
      <h2
        class="sg-font-display m-0 mt-2 tracking-[-0.02em] text-[40px] leading-tight"
        :style="{ color: 'var(--color-foreground)' }"
      >
        {{ title }}
      </h2>
    </Box>
    <p
      class="m-0 max-w-[44ch] text-[14px]"
      :style="{ color: 'var(--color-muted)' }"
    >
      <slot name="desc" />
    </p>
  </Box>
</template>
