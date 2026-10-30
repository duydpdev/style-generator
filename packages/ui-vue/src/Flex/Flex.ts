import type {
  FlexAlign,
  FlexJustify,
  RecipeProps,
} from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { layoutProps, spacingProps } from "../shared/vueProps";

import type { FlexDeps } from "./Flex.types";

/** `Stack` is a Flex whose default direction is `column`; `name` labels it in devtools. */
export const createFlex = <W extends UiTokens>(
  deps: FlexDeps,
  defaultDirection: "row" | "column",
  name = "Flex",
) =>
  defineComponent({
    name,
    props: {
      as: { type: String, default: "div" },
      direction: {
        type: String as PropType<"row" | "column">,
        default: defaultDirection,
      },
      align: { type: String as PropType<FlexAlign>, default: undefined },
      justify: { type: String as PropType<FlexJustify>, default: undefined },
      wrap: { type: Boolean, default: undefined },
      ...layoutProps<W>(),
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          direction,
          align,
          justify,
          wrap,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const split = splitStyleProps(own, deps.layout, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.stack({ direction, align, justify, wrap } as RecipeProps),
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
