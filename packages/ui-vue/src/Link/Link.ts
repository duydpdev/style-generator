import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { ColorKey, UiTokens } from "../shared/types";
import { spacingProps } from "../shared/vueProps";

import type { LinkDeps } from "./Link.types";

export const createLink = <W extends UiTokens>(deps: LinkDeps) =>
  defineComponent({
    name: "Link",
    props: {
      as: { type: String, default: "a" },
      color: { type: String as PropType<ColorKey<W>>, default: undefined },
      underline: {
        type: String as PropType<"always" | "hover" | "none">,
        default: undefined,
      },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          color,
          underline,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.link({ color, underline } as RecipeProps),
                spacing.className,
              ),
              spacing.style,
            ),
          },
          slots.default?.(),
        );
      };
    },
  });
