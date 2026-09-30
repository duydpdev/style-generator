<script setup lang="ts">
import Box from "~/components/Box.vue";
import Text from "~/components/Text.vue";
import Button from "~/components/Button.vue";
import SectionHead from "~/components/sections/SectionHead.vue";

const COLORS = ["primary", "secondary", "success", "danger"] as const;
const VARIANTS = [
  { id: "fill", label: "Fill" },
  { id: "outline", label: "Outline" },
  { id: "soft", label: "Soft" },
  { id: "link", label: "Link" },
] as const;
const SIZES = ["sm", "md", "lg"] as const;
</script>

<template>
  <section class="border-t py-14" :style="{ borderColor: 'var(--c-line)' }">
    <SectionHead num="04 — Button" title="cva × compoundVariants.">
      <template #desc>
        Sixteen permutations from a single <code>style.ts</code>. Each cell here
        is the rendered class chain — final classes are merged through
        <code>cn(clsx, twMerge)</code>.
      </template>
    </SectionHead>

    <Box
      class="grid grid-cols-[120px_repeat(4,1fr)] items-center gap-x-4 gap-y-4"
    >
      <div />
      <Text v-for="c in COLORS" :key="c" type="text12Mono" color="muted">
        {{ c }}
      </Text>
      <Box v-for="v in VARIANTS" :key="v.id" class="contents">
        <Text type="text12Mono" color="muted" class="uppercase tracking-wider">
          {{ v.label }}
        </Text>
        <Box v-for="c in COLORS" :key="`${v.id}-${c}`">
          <Button :variant="v.id" :color="c">{{
            v.label.toLowerCase()
          }}</Button>
        </Box>
      </Box>
    </Box>

    <Box
      :mt="10"
      :pt="7"
      class="border-t border-dashed"
      :style="{ borderColor: 'var(--c-line)' }"
    >
      <Text
        type="text12Mono"
        color="muted"
        class="mb-4 block uppercase tracking-wider"
      >
        Sizes
      </Text>
      <Box :gap="3" class="flex flex-wrap items-center">
        <Button
          v-for="s in SIZES"
          :key="s"
          variant="fill"
          color="primary"
          :size="s"
        >
          size · {{ s }}
        </Button>
      </Box>
    </Box>
  </section>
</template>
