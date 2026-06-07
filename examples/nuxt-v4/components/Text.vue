<script setup lang="ts">
import { computed } from "vue";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import { cn } from "../lib/utils";
import { textStyle, textAlign, textDecoration } from "./text.style";
import type { Theme } from "../theme/design-tokens";

interface TextProps {
  type?: TextVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  /** Polymorphic tag — defaults to `p`. */
  as?: string;
  color?: ColorVariant<Theme>;
}

const props = withDefaults(defineProps<TextProps>(), {
  type: "text16Medium",
  color: "foreground",
});

const classes = computed(() =>
  cn(
    textStyle({
      type: props.type,
      decoration: props.decoration,
      align: props.align,
      color: props.color,
    }),
  ),
);
</script>

<template>
  <component :is="as ?? 'p'" :class="classes">
    <slot />
  </component>
</template>
