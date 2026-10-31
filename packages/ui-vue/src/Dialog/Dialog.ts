import type { RecipeProps } from "design-system-example/recipes";
import {
  defineComponent,
  h,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  type PropType,
  type VNode,
} from "vue";

import { orUndefined } from "../shared/splitStyleProps";
import type { BlurKey, UiTokens } from "../shared/types";
import { stringProp, type ControlSize } from "../shared/vueProps";

import type { DialogDeps } from "./Dialog.types";

/**
 * The page owns `open`; the component owns the overlay, Escape and the outside
 * click, and asks to close with `close`. Attributes land on the dialog element.
 */
export const createDialog = <W extends UiTokens>(deps: DialogDeps) =>
  defineComponent({
    name: "Dialog",
    inheritAttrs: false,
    props: {
      open: { type: Boolean, required: true },
      size: { type: String as PropType<ControlSize>, default: undefined },
      blur: stringProp<"none" | BlurKey<W>>(),
    },
    emits: { close: () => true },
    setup(props, { attrs, emit, slots }) {
      const onKeydown = (event: KeyboardEvent) => {
        if (props.open && event.key === "Escape") emit("close");
      };
      onMounted(() => {
        document.addEventListener("keydown", onKeydown);
      });
      onBeforeUnmount(() => {
        document.removeEventListener("keydown", onKeydown);
      });
      return () => {
        if (!props.open) return null;
        const panel = h(
          "div",
          mergeProps(attrs, {
            role: "dialog",
            "aria-modal": "true",
            tabindex: -1,
            class: orUndefined(
              deps.cn(deps.dialog({ size: props.size } as RecipeProps)),
            ),
            onVnodeMounted: (vnode: VNode) => {
              (vnode.el as HTMLElement).focus();
            },
          }),
          slots.default?.(),
        );
        return h(
          "div",
          {
            class: orUndefined(
              deps.cn(deps.overlay({ blur: props.blur } as RecipeProps)),
            ),
            onClick: (event: MouseEvent) => {
              if (event.target === event.currentTarget) emit("close");
            },
          },
          [panel],
        );
      };
    },
  });
