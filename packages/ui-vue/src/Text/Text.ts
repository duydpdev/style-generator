import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { ColorKey, TypographyKey, UiTokens } from "../shared/types";
import { spacingProps } from "../shared/vueProps";

import type { TextDeps } from "./Text.types";

export const createText = <W extends UiTokens>(deps: TextDeps) =>
  defineComponent({
    name: "Text",
    props: {
      as: { type: String, default: "p" },
      type: {
        type: String as PropType<TypographyKey<W>>,
        default: undefined,
      },
      color: { type: String as PropType<ColorKey<W>>, default: undefined },
      align: {
        type: String as PropType<"left" | "center" | "right">,
        default: undefined,
      },
      decoration: {
        type: String as PropType<"underline" | "lineThrough" | "none">,
        default: undefined,
      },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          type,
          color,
          align,
          decoration,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.text({
                  type: type ?? deps.defaults.type,
                  color: color ?? deps.defaults.color,
                  align,
                  decoration,
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
