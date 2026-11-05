<script setup lang="ts">
import { useAttrs, type InputHTMLAttributes } from "vue";

import { cn } from "../../theme";

import { inputRecipe } from "./style";
import type { InputProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<InputProps>(), { invalid: undefined });
const attrs = useAttrs();

const root = () => {
  const { class: klass, "aria-invalid": ariaInvalid, ...rest } = attrs;
  return {
    ...rest,
    "aria-invalid":
      props.invalid === true
        ? true
        : (ariaInvalid as InputHTMLAttributes["aria-invalid"]),
    class: cn(
      inputRecipe({
        size: props.size,
        placeholderColor: props.placeholderColor,
      }),
      klass as ClassValue,
    ),
  };
};
</script>

<template>
  <input v-bind="root()" />
</template>
