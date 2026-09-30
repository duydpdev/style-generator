<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import SectionHead from "~/components/sections/SectionHead.vue";

const SPACING = [
  { name: "p={2}", px: 8 },
  { name: "p={4}", px: 16 },
  { name: "p={6}", px: 24 },
  { name: "p={8}", px: 32 },
  { name: "p={12}", px: 48 },
];

const SHADOWS: { key: "sm" | "md" | "lg" }[] = [
  { key: "sm" },
  { key: "md" },
  { key: "lg" },
];

const RADII: { key: "sm" | "md" | "lg" | "pill"; width: number }[] = [
  { key: "sm", width: 80 },
  { key: "md", width: 80 },
  { key: "lg", width: 80 },
  { key: "pill", width: 130 },
];
</script>

<template>
  <section class="border-t py-14" :style="{ borderColor: 'var(--c-line)' }">
    <SectionHead
      num="03 — Spacing, radius & shadow"
      title="A measured cadence."
    >
      <template #desc>
        Padding compiles to inline <code>--sg-sp-*</code> variables — zero
        safelist. Radii and shadows stay tokenized so a single palette swap
        reshapes the entire surface treatment.
      </template>
    </SectionHead>

    <Box class="mb-12">
      <Text
        type="text12Mono"
        color="muted"
        class="mb-5 block uppercase tracking-wider"
      >
        Padding scale
      </Text>
      <Box
        v-for="item in SPACING"
        :key="item.name"
        class="grid grid-cols-[80px_1fr_80px] items-center gap-4 border-t border-dashed py-3 first:border-t-0"
        :style="{ borderColor: 'var(--c-line)' }"
      >
        <Text type="text12Mono" color="muted">{{ item.name }}</Text>
        <div>
          <div
            class="sg-spacing-bar"
            :style="{ width: `${(item.px / 48) * 100}%` }"
          />
        </div>
        <Text type="text12Mono" class="text-right">{{ item.px }}px</Text>
      </Box>
    </Box>

    <Box class="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
      <Box>
        <Text
          type="text12Mono"
          color="muted"
          class="mb-5 block uppercase tracking-wider"
        >
          Radius
        </Text>
        <Box :gap="4" class="flex flex-wrap items-end">
          <Box
            v-for="r in RADII"
            :key="r.key"
            class="flex items-end justify-center pb-2"
            :style="{
              width: `${r.width}px`,
              height: '80px',
              background: 'var(--c-primary-soft)',
              border:
                '1px dashed color-mix(in srgb, var(--color-primary) 40%, transparent)',
              borderRadius: `var(--radius-${r.key})`,
            }"
          >
            <Text type="text12Mono" :style="{ color: 'var(--color-primary)' }">
              {{ r.key }}
            </Text>
          </Box>
        </Box>
      </Box>
      <Box>
        <Text
          type="text12Mono"
          color="muted"
          class="mb-5 block uppercase tracking-wider"
        >
          Shadow
        </Text>
        <Box :gap="4" class="flex">
          <Box
            v-for="s in SHADOWS"
            :key="s.key"
            background-color="surface"
            rounded="md"
            :shadow="s.key"
            class="sg-glass-target flex h-[100px] flex-1 items-end justify-center border pb-3"
            :style="{ borderColor: 'var(--c-line)' }"
          >
            <Text type="text12Mono" color="muted">{{ s.key }}</Text>
          </Box>
        </Box>
      </Box>
    </Box>
  </section>
</template>
