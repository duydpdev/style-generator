import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { layoutBaseProps, spacingProps } from "../shared/vueProps";

import type { ListDeps } from "./List.types";

/** `position` is the list-style position here, so the Box's CSS `position` prop is left out. */
export const createList = <W extends UiTokens>(deps: ListDeps) =>
  defineComponent({
    name: "List",
    props: {
      as: { type: String, default: "ul" },
      marker: {
        type: String as PropType<"none" | "disc" | "decimal">,
        default: undefined,
      },
      position: {
        type: String as PropType<"inside" | "outside">,
        default: undefined,
      },
      ...layoutBaseProps<W>(),
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          marker,
          position,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const split = splitStyleProps(own, deps.layout, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.list({ marker, position } as RecipeProps),
                split.className,
              ),
              split.style,
            ),
          },
          slots.default?.(),
        );
      };
    },
  });
