<script setup lang="ts">
import {
  cn,
  splitSpacingProps,
  textPreset,
  textRecipe,
  tokens,
} from "design-system-example";
import type { BoxSpacingProps, TextStyleProps } from "design-system-example";
import { useAttrs } from "vue";

/**
 * Text: typography, color, alignment and decoration from the theme. `type`
 * and `color` default to the design-system text preset. Spacing props work
 * as in Box (declared with `@vue-ignore`, read from the attributes).
 */
export interface TextProps
  extends /* @vue-ignore */ BoxSpacingProps, TextStyleProps {
  as?: string;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<TextProps>(), {
  as: "p",
  type: textPreset.defaultType,
  color: textPreset.defaultColor,
});
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

// Root attributes: the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  return {
    ...rest,
    class: cn(textRecipe(props), spacing.className),
    ...(spacing.className === "" ? {} : { style: spacing.style }),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
