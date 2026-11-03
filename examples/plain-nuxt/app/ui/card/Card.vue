<script setup lang="ts">
import { useAttrs } from "vue";

import { cn } from "../../theme";

import { cardRecipe } from "./style";
import type { CardProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<CardProps>(), { as: "div" });
const attrs = useAttrs();

const root = () => {
  const { class: klass, ...rest } = attrs;
  return {
    ...rest,
    class: cn(
      cardRecipe({
        tone: props.tone,
        padding: props.padding,
        radius: props.radius,
        shadow: props.shadow,
        border: props.border,
      }),
      klass as ClassValue,
    ),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
