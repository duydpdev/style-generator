<script setup lang="ts">
import { useAttrs } from "vue";

import { cn } from "../../theme";

import { linkRecipe } from "./style";
import type { LinkProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<LinkProps>(), { as: "a" });
const attrs = useAttrs();

const root = () => {
  const { class: klass, ...rest } = attrs;
  return {
    ...rest,
    class: cn(
      linkRecipe({ tone: props.tone, underline: props.underline }),
      klass as ClassValue,
    ),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
