<script setup lang="ts">
import { splitSpacing } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import { textRecipe } from "./style";
import type { TextProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), { as: "p" });
const attrs = useAttrs();

const root = () => {
  const split = splitSpacing(attrs, tokens.spacingProperties);
  const { class: klass, style, ...rest } = split.rest;
  return {
    ...rest,
    class: cn(
      textRecipe({
        type: props.type,
        color: props.color,
        align: props.align,
        decoration: props.decoration,
        transform: props.transform,
        italic: props.italic,
        truncate: props.truncate,
        lineClamp: props.lineClamp,
        wrap: props.wrap,
      }),
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
