<script setup lang="ts">
import { computed } from "vue";
import { resolveSpacingProps } from "@duydpdev/style-generator/spacing";

import { cn } from "../lib/utils";
import { boxStyle } from "./box.style";
import type { BoxProps } from "./box.type";

const props = defineProps<BoxProps>();

const spacing = computed(() =>
  resolveSpacingProps({
    p: props.p,
    px: props.px,
    py: props.py,
    pt: props.pt,
    pb: props.pb,
    pl: props.pl,
    pr: props.pr,
    m: props.m,
    mx: props.mx,
    my: props.my,
    mt: props.mt,
    mb: props.mb,
    ml: props.ml,
    mr: props.mr,
    top: props.top,
    left: props.left,
    right: props.right,
    bottom: props.bottom,
    gap: props.gap,
    "gap-x": props.gapX,
    "gap-y": props.gapY,
  }),
);

const classes = computed(() =>
  cn(
    boxStyle({
      backgroundColor: props.backgroundColor,
      position: props.position,
      borderColor: props.borderColor,
      innerBorder: props.innerBorder,
      border: props.border,
      borderX: props.borderX,
      borderY: props.borderY,
      borderT: props.borderT,
      borderB: props.borderB,
      borderL: props.borderL,
      borderR: props.borderR,
      rounded: props.rounded,
      roundedT: props.roundedT,
      roundedB: props.roundedB,
      roundedL: props.roundedL,
      roundedR: props.roundedR,
      shadow: props.shadow,
      backdropBlur: props.backdropBlur,
    }),
    spacing.value.classNames,
  ),
);

// React inline styles auto-append `px` to bare numbers; Vue does not, so coerce.
const toLength = (v?: number | string) =>
  typeof v === "number" ? `${v}px` : v;

const styles = computed(() => ({
  width: toLength(props.width),
  height: toLength(props.height),
  minHeight: toLength(props.minHeight),
  maxWidth: toLength(props.maxWidth),
  maxHeight: toLength(props.maxHeight),
  minWidth: toLength(props.minWidth),
  ...spacing.value.style,
}));

const innerClasses = computed(() =>
  cn(
    "pointer-events-none absolute inset-0",
    boxStyle({
      position: "absolute",
      borderColor: props.borderColor,
      border: props.border,
      borderX: props.borderX,
      borderY: props.borderY,
      borderT: props.borderT,
      borderB: props.borderB,
      borderL: props.borderL,
      borderR: props.borderR,
      rounded: props.rounded,
      roundedT: props.roundedT,
      roundedB: props.roundedB,
      roundedL: props.roundedL,
      roundedR: props.roundedR,
    }),
  ),
);
</script>

<template>
  <component :is="as ?? 'div'" :class="classes" :style="styles">
    <slot />
    <div v-if="innerBorder" :class="innerClasses" />
  </component>
</template>
