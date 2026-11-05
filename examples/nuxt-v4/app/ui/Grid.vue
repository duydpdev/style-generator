<script lang="ts">
import {
  cn,
  gridRecipe,
  splitSpacingProps,
  tokens,
} from "design-system-example";
import {
  BOX_VARIANT_KEYS,
  createBoxRecipe,
  gridColumns,
} from "design-system-example/recipes";
import { useAttrs } from "vue";
import type {
  BreakpointKeys,
  ResponsiveValueStrict,
} from "@duydpdev/style-generator/types";
import type {
  BoxSpacingProps,
  BoxStyleProps,
  GridRecipeProps,
} from "design-system-example";
import type { options } from "design-system-example/style-gen.options";

// Module scope (this block runs once, `<script setup>` once per instance):
// layout style classes without the Box preset, so no `relative`.
const layoutRecipe = createBoxRecipe(tokens);
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
 * Grid: CSS grid with explicit `columns`: a count (`3`), a responsive count
 * (`{ base: 1, md: 3 }`) or a track list (`"80px 1fr"`). App code must pass
 * `columns` (ESLint); a single column is a Stack.
 */
export interface GridProps extends /* @vue-ignore */ BoxSpacingProps, Layout {
  as?: string;
  columns?: ResponsiveValueStrict<
    number | string,
    BreakpointKeys<typeof options>
  >;
  align?: NonNullable<GridRecipeProps["align"]>;
  justify?: NonNullable<GridRecipeProps["justify"]>;
  flow?: NonNullable<GridRecipeProps["flow"]>;
  /** Row count (`grid-rows-N`); on `as="textarea"` it is this prop, not the HTML `rows` attribute. */
  rows?: NonNullable<GridRecipeProps["rows"]>;
}

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<GridProps>(), { as: "div" });
defineSlots<{ default?: () => unknown }>();
const attrs = useAttrs();

// Root attributes: the caller's other attributes, then class and style.
const root = () => {
  const { spacing, rest } = splitSpacingProps(
    attrs as BoxSpacingProps & Record<string, unknown>,
    tokens.spacingProperties,
  );
  const columns =
    props.columns === undefined ? undefined : gridColumns(props.columns);
  const style: Record<string, string> = {
    ...spacing.style,
    ...columns?.style,
  };
  for (const key of SIZE_KEYS) {
    const value = props[key];
    if (value !== undefined) {
      style[key] = typeof value === "number" ? `${String(value)}px` : value;
    }
  }
  return {
    ...rest,
    class: cn(
      gridRecipe({
        align: props.align,
        justify: props.justify,
        flow: props.flow,
        rows: props.rows,
      }),
      layoutRecipe(
        Object.fromEntries(BOX_VARIANT_KEYS.map((key) => [key, props[key]])),
      ),
      columns?.className,
      spacing.className,
    ),
    ...(Object.keys(style).length > 0 ? { style } : {}),
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
