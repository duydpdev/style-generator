import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { spacingProps, stringProp } from "../shared/vueProps";

import type { BadgeDeps } from "./Badge.types";

export const createBadge = <W extends UiTokens, G extends string>(
  deps: BadgeDeps,
) =>
  defineComponent({
    name: "Badge",
    props: {
      as: { type: String, default: "span" },
      color: stringProp<G>(),
      variant: {
        type: String as PropType<"soft" | "solid" | "outline">,
        default: undefined,
      },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          color,
          variant,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.badge({ color, variant } as RecipeProps),
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
