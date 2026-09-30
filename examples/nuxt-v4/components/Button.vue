<script setup lang="ts">
import { computed } from "vue";
import type { VariantProps } from "class-variance-authority";

import { cn } from "../lib/utils";
import { buttonVariants } from "./button.style";

type Variants = VariantProps<typeof buttonVariants>;

interface ButtonProps {
  variant?: Variants["variant"];
  color?: Variants["color"];
  size?: Variants["size"];
  type?: "button" | "submit" | "reset";
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: "fill",
  color: "primary",
  size: "md",
  type: "button",
});

const classes = computed(() =>
  cn(
    buttonVariants({
      variant: props.variant,
      color: props.color,
      size: props.size,
    }),
  ),
);
</script>

<template>
  <button :type="type" data-slot="button" :class="classes">
    <span v-if="$slots.prefix" data-icon="start"><slot name="prefix" /></span>
    <span><slot /></span>
    <span v-if="$slots.suffix" data-icon="end"><slot name="suffix" /></span>
  </button>
</template>
