import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { spacingProps } from "../shared/vueProps";

import type { CardDeps } from "./Card.types";

export const createCard = <W extends UiTokens>(deps: CardDeps) =>
  defineComponent({
    name: "Card",
    props: {
      as: { type: String, default: "div" },
      tone: {
        type: String as PropType<"surface" | "muted" | "outline">,
        default: undefined,
      },
      padding: {
        type: String as PropType<"none" | "sm" | "md" | "lg">,
        default: undefined,
      },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const { as, tone, padding, ...own }: Readonly<Record<string, unknown>> =
          props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.card({ tone, padding } as RecipeProps),
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
