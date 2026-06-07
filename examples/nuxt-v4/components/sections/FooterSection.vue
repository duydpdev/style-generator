<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";

defineProps<{ tailwindVersion: 3 | 4 }>();
</script>

<template>
  <footer
    class="mt-6 border-t pt-16 pb-20"
    :style="{ borderColor: 'var(--c-line)' }"
  >
    <Box class="flex flex-wrap items-end justify-between gap-6">
      <Box>
        <p
          class="sg-font-display m-0 mb-3 max-w-[38ch] text-[28px] leading-tight"
          :style="{ color: 'var(--color-foreground)' }"
        >
          "Change <code>theme.json</code> — everything downstream re-renders."
        </p>
        <Text type="text12Mono" color="muted">
          @duydpdev/style-generator · MIT · 2026
        </Text>
      </Box>
      <Text type="text12Mono" color="muted">
        Vue 3 · Tailwind v{{ tailwindVersion }} · cva · twMerge
      </Text>
    </Box>
  </footer>
</template>
