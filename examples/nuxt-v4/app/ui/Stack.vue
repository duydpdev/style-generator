<script setup lang="ts">
import Flex from "./Flex.vue";
import type { FlexProps } from "./Flex.vue";

/**
 * Stack: a Flex whose direction defaults to `column`, for a vertical single
 * column. Spacing attributes (`gap`, `p`, …) fall through to Flex.
 */
const props = withDefaults(defineProps<FlexProps>(), {
  as: "div",
  direction: "column",
});
defineSlots<{ default?: () => unknown }>();
</script>

<template>
  <Flex v-bind="props"><slot /></Flex>
</template>
