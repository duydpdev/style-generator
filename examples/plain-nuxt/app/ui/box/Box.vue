<script setup lang="ts">
import { splitLayout } from "@duydpdev/style-generator/ui";
import { useAttrs } from "vue";

import { cn, tokens } from "../../theme";

import {
  BOX_OVERLAY_KEYS,
  BOX_SIZE_KEYS,
  BOX_VARIANT_KEYS,
  boxRecipe,
} from "./style";
import type { BoxProps } from "./types";

type ClassValue = Parameters<typeof cn>[number];

defineOptions({ inheritAttrs: false });
const props = withDefaults(defineProps<BoxProps>(), {
  as: "div",
  innerBorder: undefined,
});
const attrs = useAttrs();

// Own props are taken out first: `{ ...attrs, ...own }` must not hand
// `innerBorder` (or `as`) to `rest`, or they would render as DOM attributes.
const layout = () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, sonarjs/no-unused-vars -- `as` is the tag, never an attribute
  const { as: _as, innerBorder, position, ...own } = props;
  const framed = innerBorder === true;
  const pos = position ?? (framed ? "relative" : undefined);
  return splitLayout(
    { ...attrs, ...own },
    boxRecipe,
    tokens.spacingProperties,
    BOX_VARIANT_KEYS,
    BOX_SIZE_KEYS,
    {
      ...(pos === undefined ? {} : { position: pos }),
      ...(framed ? { innerBorder: true } : {}),
    },
  );
};

const root = () => {
  const split = layout();
  const { class: klass, style, ...rest } = split.rest;
  return {
    ...rest,
    class: cn(split.className, klass as ClassValue),
    style: [split.style, style],
  };
};

const overlayClass = () => {
  const { variants } = layout();
  const overlay = Object.fromEntries(
    BOX_OVERLAY_KEYS.map((key) => [key, variants[key]]),
  );
  return cn(boxRecipe({ ...overlay, overlay: true, position: "absolute" }));
};
</script>

<template>
  <component :is="props.as" v-bind="root()">
    <slot />
    <span
      v-if="props.innerBorder === true"
      aria-hidden="true"
      :class="overlayClass()"
    />
  </component>
</template>
