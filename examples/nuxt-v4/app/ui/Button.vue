<script setup lang="ts">
import {
  buttonRecipe,
  cn,
  splitSpacingProps,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, ButtonRecipeProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Button: variant, intent color and size from the design-system button
 * recipe. Emits `click`; the `prefix`/`suffix` slots wrap icons around the
 * label. Renders `type="button"` when `as` is `button`; a caller's `type`
 * attribute wins. Spacing props work as in Box.
 */
export interface ButtonProps extends /* @vue-ignore */ BoxSpacingProps {
  as?: string;
  variant?: NonNullable<ButtonRecipeProps["variant"]>;
  color?: NonNullable<ButtonRecipeProps["color"]>;
  size?: NonNullable<ButtonRecipeProps["size"]>;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<ButtonProps>(), { as: "button" });
const emit = defineEmits<{ click: [event: MouseEvent] }>();
const slots = defineSlots<{
  default?: () => unknown;
  prefix?: () => unknown;
  suffix?: () => unknown;
}>();
const attrs = useAttrs();

// Root attributes: defaults, the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  return {
    type: props.as === "button" ? "button" : undefined,
    "data-slot": "button",
    ...rest,
    class: cn(buttonRecipe(props), spacing.className),
    ...(spacing.className === "" ? {} : { style: spacing.style }),
  };
};

const onClick = (event: MouseEvent) => {
  emit("click", event);
};
</script>

<template>
  <component :is="props.as" v-bind="root()" @click="onClick">
    <span v-if="slots.prefix" data-icon="start"><slot name="prefix" /></span>
    <span><slot /></span>
    <span v-if="slots.suffix" data-icon="end"><slot name="suffix" /></span>
  </component>
</template>
