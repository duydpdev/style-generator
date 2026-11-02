<script setup lang="ts">
import {
  boxRecipe,
  cn,
  splitSpacingProps,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, BoxStyleProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Box: the token-typed layout primitive. Style props become box-recipe
 * classes, sizes become inline lengths (a number is px) and spacing props
 * (`p`, `gapX`, …) become `.sp-*` classes. The SFC compiler cannot expand
 * the spacing props' mapped type, so they are declared with `@vue-ignore`:
 * vue-tsc still checks them, and they arrive as camelCase attributes.
 */
export interface BoxProps
  extends /* @vue-ignore */ BoxSpacingProps, BoxStyleProps {
  as?: string;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<BoxProps>(), { as: "div" });
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

const SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

// Root attributes: the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  const style: Record<string, string> = { ...spacing.style };
  for (const key of SIZE_KEYS) {
    const value = props[key];
    if (value !== undefined) {
      style[key] = typeof value === "number" ? `${String(value)}px` : value;
    }
  }
  return {
    ...rest,
    class: cn(boxRecipe(props), spacing.className),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
};

// The inner border: an overlay that repeats the border and radius props.
const overlayClass = () =>
  cn(
    boxRecipe({
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
      overlay: true,
      position: "absolute",
    }),
  );
</script>

<template>
  <component :is="props.as" v-bind="root()">
    <slot />
    <span v-if="props.innerBorder" aria-hidden="true" :class="overlayClass()" />
  </component>
</template>
