<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import { useStyleGuide } from "~/composables/useStyleGuide";
import { PALETTE_LIST } from "~/data/palettes";

const { state, setTweak } = useStyleGuide();
</script>

<template>
  <section class="pt-22 pb-14">
    <span class="sg-eyebrow mb-7 block">A token-driven design system</span>
    <h1
      class="sg-font-display sg-hero-title m-0 mb-7 max-w-[14ch] tracking-[-0.025em] text-[clamp(56px,8vw,104px)] leading-[0.94]"
      :style="{ color: 'var(--color-foreground)' }"
    >
      Tokens, <em>composed</em> with intention.
    </h1>
    <Text class="mb-10 max-w-[56ch] text-[18px] leading-[1.55]" color="muted">
      A small, opinionated set of design primitives —
      <b :style="{ color: 'var(--color-foreground)', fontWeight: 500 }">
        colors, type, spacing, radii, shadows </b
      >— that compile down to Tailwind utilities and inline CSS variables. Pick
      a palette below to remix every component on this page in real time.
    </Text>
    <Box :gap="2" class="flex flex-wrap">
      <button
        v-for="p in PALETTE_LIST"
        :key="p.id"
        type="button"
        class="sg-palette-pick"
        :aria-pressed="state.palette === p.id"
        @click="setTweak('palette', p.id)"
      >
        <span class="flex">
          <span
            v-for="c in p.dots"
            :key="c"
            class="sg-palette-dot"
            :style="{ background: c }"
          />
        </span>
        {{ p.label }}
      </button>
    </Box>
  </section>
</template>
