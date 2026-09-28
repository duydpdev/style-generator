<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import SectionHead from "~/components/sections/SectionHead.vue";

const ROW_CLASS = "flex flex-wrap items-stretch border rounded-md bg-surface";

// Literal prop-syntax labels kept as constants — embedding `{{ }}` directly in
// a mustache expression would break the Vue template parser.
const LABEL_P = "p={{ base: 4, md: 8, lg: 12 }}";
const LABEL_GAP = "gap={{ base: 2, md: 6 }}";
const LABEL_GAP_X = "gapX={{ base: 2, md: 6 }}";
</script>

<template>
  <section class="border-t py-14">
    <SectionHead num="05 — Responsive" title="Spacing reacts to breakpoints.">
      <template #desc>
        Pass a ResponsiveValueStrict object to spacing props. Each breakpoint
        key sets a CSS custom property; the plugin's fallback chain selects
        the right value at each viewport.
      </template>
    </SectionHead>

    <div class="grid gap-8">
      <div>
        <Text
          type="text12Mono"
          color="muted"
          class="mb-3 block uppercase tracking-wider"
        >
          {{ LABEL_P }}
        </Text>
        <Box :class="ROW_CLASS" :p="{ base: 4, md: 8, lg: 12 }">
          <Box class="rounded-sm bg-primary/10 px-3 py-2">
            <Text type="text14Regular" color="primary">
              Padding scales with viewport
            </Text>
          </Box>
        </Box>
        <Text type="text12Mono" color="muted" class="mt-2 block">
          Resize browser: 4 → 8 → 12 at md (768px) and lg (1024px).
        </Text>
      </div>

      <div>
        <Text
          type="text12Mono"
          color="muted"
          class="mb-3 block uppercase tracking-wider"
        >
          {{ LABEL_GAP }}
        </Text>
        <Box
          class="flex flex-wrap border rounded-md bg-surface p-4"
          :gap="{ base: 2, md: 6 }"
        >
          <Box
            v-for="i in 4"
            :key="i"
            class="rounded-sm bg-secondary/15 px-3 py-2"
          >
            <Text type="text14Regular" color="secondary">Item {{ i }}</Text>
          </Box>
        </Box>
        <Text type="text12Mono" color="muted" class="mt-2 block">
          Flex gap widens from 2 to 6 at md breakpoint.
        </Text>
      </div>

      <div>
        <Text
          type="text12Mono"
          color="muted"
          class="mb-3 block uppercase tracking-wider"
        >
          {{ LABEL_GAP_X }}
        </Text>
        <Box
          class="grid grid-cols-3 border rounded-md bg-surface p-4"
          :gap-x="{ base: 2, md: 6 }"
          :gap-y="2"
        >
          <Box
            v-for="i in 6"
            :key="i"
            class="rounded-sm bg-success/15 px-3 py-2"
          >
            <Text type="text14Regular" color="success">Cell {{ i }}</Text>
          </Box>
        </Box>
        <Text type="text12Mono" color="muted" class="mt-2 block">
          Column gap responsive, row gap stays fixed at 2.
        </Text>
      </div>
    </div>
  </section>
</template>
