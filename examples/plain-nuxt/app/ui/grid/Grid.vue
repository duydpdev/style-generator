<script setup lang="ts">
import { splitLayout } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import {
  LAYOUT_SIZE_KEYS,
  LAYOUT_VARIANT_KEYS,
  gridColumns,
  gridRecipe,
  layoutRecipe,
} from "./style";
import type { GridProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<GridProps>(), { as: "div" });
const attrs = useAttrs();

// Own props are taken out first: `{ ...attrs, ...own }` must not hand
// `columns`, `align`, ... to `rest`, or they would render as DOM attributes.
const root = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars -- `as` is the tag, never an attribute
  const { as: _as, columns, align, justify, flow, rows, ...own } = props;
  const split = splitLayout(
    { ...attrs, ...own },
    layoutRecipe,
    tokens.spacingProperties,
    LAYOUT_VARIANT_KEYS,
    LAYOUT_SIZE_KEYS,
  );
  const cols = columns === undefined ? undefined : gridColumns(columns);
  const { class: klass, style, ...rest } = split.rest;
  return {
    ...rest,
    class: cn(
      gridRecipe({ align, justify, flow, rows }),
      cols?.className,
      split.className,
      klass as ClassValue,
    ),
    style: [split.style, cols?.style, style],
  };
};
</script>

<template>
  <component :is="props.as" v-bind="root()"><slot /></component>
</template>
