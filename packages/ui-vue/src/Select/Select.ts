import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs } from "../shared/splitStyleProps";
import type { ControlSize } from "../shared/vueProps";

import type { SelectDeps } from "./Select.types";

/** `v-model` binds `modelValue`; the default slot holds the `<option>`s. */
export const createSelect = (deps: SelectDeps) =>
  defineComponent({
    name: "Select",
    props: {
      size: { type: String as PropType<ControlSize>, default: undefined },
      invalid: { type: Boolean, default: undefined },
      modelValue: { type: String, default: undefined },
    },
    emits: {
      "update:modelValue": (value: string) => typeof value === "string",
    },
    setup(props, { emit, slots }) {
      return () =>
        h(
          "select",
          {
            value: props.modelValue,
            "aria-invalid": props.invalid === true ? true : undefined,
            ...rootAttrs(
              deps.cn(
                deps.select({
                  size: props.size,
                  invalid: props.invalid,
                } as RecipeProps),
              ),
            ),
            onChange: (event: Event) => {
              emit(
                "update:modelValue",
                (event.target as HTMLSelectElement).value,
              );
            },
          },
          slots.default?.(),
        );
    },
  });
