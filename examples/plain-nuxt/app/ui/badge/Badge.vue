<script setup lang="ts">
import { useAttrs } from "vue";

import { cn } from "../../theme";

import { badgeRecipe } from "./style";
import type { BadgeProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<BadgeProps>(), { as: "span" });
const attrs = useAttrs();

const root = () => {
  const { class: klass, ...rest } = attrs;
  return {
    ...rest,
    class: cn(
      badgeRecipe({ color: props.color, variant: props.variant }),
      klass as ClassValue,
    ),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
