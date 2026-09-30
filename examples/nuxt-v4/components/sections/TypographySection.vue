<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import SectionHead from "~/components/sections/SectionHead.vue";

interface TypoRow {
  label: string;
  spec: string;
  className: string;
  body: string;
}

const ROWS: TypoRow[] = [
  {
    label: "Display · Serif",
    spec: "Instrument Serif · 80/100% · -0.025em",
    className:
      "sg-font-display text-[clamp(40px,6vw,80px)] tracking-[-0.025em] leading-none",
    body: "The quick brown fox.",
  },
  {
    label: "Heading · text32Bold",
    spec: "Geist 700 · 32/120% · -0.02em",
    className: "text-[32px] font-bold tracking-[-0.02em] leading-tight",
    body: "Tokens drive every component on the page.",
  },
  {
    label: "Body · text16Medium",
    spec: "Geist 500 · 16/150% · 0em",
    className: "text-[16px] font-medium leading-relaxed",
    body: "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. Sphinx of black quartz, judge my vow.",
  },
  {
    label: "Mono · code",
    spec: "JetBrains Mono 400 · 13px",
    className: "sg-font-mono text-[13px]",
    body: 'const tokens = require("./theme.json");',
  },
];
</script>

<template>
  <section class="border-t py-14" :style="{ borderColor: 'var(--c-line)' }">
    <SectionHead num="02 — Typography" title="Two voices, one rhythm.">
      <template #desc>
        <b :style="{ color: 'var(--color-foreground)' }">Instrument Serif</b>
        handles display and editorial accents;
        <b :style="{ color: 'var(--color-foreground)' }">Geist</b> carries every
        body and UI surface;
        <b :style="{ color: 'var(--color-foreground)' }">JetBrains Mono</b>
        stamps the code.
      </template>
    </SectionHead>

    <Box
      class="grid grid-cols-1 items-baseline gap-y-8 md:grid-cols-[220px_1fr] md:gap-x-12"
    >
      <Box v-for="row in ROWS" :key="row.label" class="contents">
        <Box :gap="1" class="flex flex-col">
          <Text type="text12Mono" color="muted" class="uppercase">
            {{ row.label }}
          </Text>
          <Text type="text12Mono">{{ row.spec }}</Text>
        </Box>
        <div
          :class="row.className"
          :style="
            row.label === 'Mono · code'
              ? { color: 'var(--color-muted)' }
              : { color: 'var(--color-foreground)' }
          "
        >
          {{ row.body }}
        </div>
      </Box>
    </Box>
  </section>
</template>
