import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { ColorKey, TypographyKey, UiTokens } from "../shared/types";
import { spacingProps } from "../shared/vueProps";

import type { CodeDeps } from "./Code.types";

export const createCode = <W extends UiTokens>(deps: CodeDeps) =>
  defineComponent({
    name: "Code",
    props: {
      as: { type: String, default: "code" },
      type: {
        type: String as PropType<TypographyKey<W>>,
        default: undefined,
      },
      color: { type: String as PropType<ColorKey<W>>, default: undefined },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const { as, type, color, ...own }: Readonly<Record<string, unknown>> =
          props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.code({
                  type: type ?? deps.defaults.type,
                  color,
                } as RecipeProps),
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
