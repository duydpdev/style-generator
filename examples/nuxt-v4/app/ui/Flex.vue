<script lang="ts">
import { cn, splitSpacingProps, tokens } from "design-system-example";
import {
  BOX_VARIANT_KEYS,
  createBoxRecipe,
  createFlexRecipe,
  type FlexBasis,
} from "design-system-example/recipes";
import { useAttrs } from "vue";
import type {
  BoxSpacingProps,
  BoxStyleProps,
  StackRecipeProps,
} from "design-system-example";

// Module scope (this block runs once, `<script setup>` once per instance):
// layout style classes without the Box preset, so no `relative`.
const layoutRecipe = createBoxRecipe(tokens);
const flexRecipe = createFlexRecipe(tokens);
const SIZE_KEYS = [
  "width",
  "height",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
] as const;

/** Layout style props of Box without `innerBorder`. */
type Layout = Omit<BoxStyleProps, "innerBorder">;
</script>

<script setup lang="ts">
/**
 * Flex: a flex row for two or more children (Stack is the column variant).
 * Layout style props and sizes as in Box, without `innerBorder`; spacing
 * props, `gap` included, are read from the attributes.
 */
export interface FlexProps extends /* @vue-ignore */ BoxSpacingProps, Layout {
  as?: string;
  direction?: NonNullable<StackRecipeProps["direction"]>;
  align?: NonNullable<StackRecipeProps["align"]>;
  justify?: NonNullable<StackRecipeProps["justify"]>;
  wrap?: boolean;
  divideColor?: NonNullable<StackRecipeProps["divideColor"]>;
  /** Item props: `grow`/`shrink` toggle `grow`/`grow-0` and `shrink`/`shrink-0`; `basis` is `basis-*`. */
  grow?: boolean;
  shrink?: boolean;
  basis?: FlexBasis;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<FlexProps>(), {
  as: "div",
  direction: "row",
  grow: undefined,
  shrink: undefined,
});
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

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
    class: cn(
      flexRecipe({
        direction: props.direction,
        align: props.align,
        justify: props.justify,
        wrap: props.wrap,
        divideColor: props.divideColor,
        grow: props.grow,
        shrink: props.shrink,
        basis: props.basis,
      }),
      layoutRecipe(
        Object.fromEntries(BOX_VARIANT_KEYS.map((key) => [key, props[key]])),
      ),
      spacing.className,
    ),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
