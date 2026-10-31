import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs } from "../shared/splitStyleProps";
import type { ControlSize } from "../shared/vueProps";

import type { InputDeps } from "./Input.types";

/** `v-model` binds `modelValue`; other attributes (`placeholder`, `type`, …) fall through to the `<input>`. */
export const createInput = (deps: InputDeps) =>
  defineComponent({
    name: "Input",
    props: {
      size: { type: String as PropType<ControlSize>, default: undefined },
      invalid: { type: Boolean, default: undefined },
      modelValue: { type: String, default: undefined },
    },
    emits: {
      "update:modelValue": (value: string) => typeof value === "string",
    },
    setup(props, { emit }) {
      return () =>
        h("input", {
          value: props.modelValue,
          "aria-invalid": props.invalid === true ? true : undefined,
          ...rootAttrs(
            deps.cn(
              deps.input({
                size: props.size,
                invalid: props.invalid,
              } as RecipeProps),
            ),
          ),
          onInput: (event: Event) => {
            emit("update:modelValue", (event.target as HTMLInputElement).value);
          },
        });
    },
  });
