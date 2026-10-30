import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import {
  gridColumns,
  type FlexAlign,
  type FlexJustify,
  type GridColumnsValue,
  type RecipeProps,
} from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { BreakpointKey, UiTokens } from "../shared/types";
import { layoutProps, spacingProps } from "../shared/vueProps";

import type { GridDeps } from "./Grid.types";

export const createGrid = <W extends UiTokens>(deps: GridDeps) =>
  defineComponent({
    name: "Grid",
    props: {
      as: { type: String, default: "div" },
      columns: {
        type: [Number, Object] as PropType<
          ResponsiveValueStrict<number, BreakpointKey<W>>
        >,
        default: undefined,
      },
      align: { type: String as PropType<FlexAlign>, default: undefined },
      justify: { type: String as PropType<FlexJustify>, default: undefined },
      flow: {
        type: String as PropType<"row" | "column" | "dense">,
        default: undefined,
      },
      ...layoutProps<W>(),
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          columns,
          align,
          justify,
          flow,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const split = splitStyleProps(own, deps.layout, deps.spacing);
        const cols =
          columns === undefined
            ? undefined
            : gridColumns(columns as GridColumnsValue);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(
                deps.grid({ align, justify, flow } as RecipeProps),
                cols?.className,
                split.className,
              ),
              { ...split.style, ...cols?.style },
            ),
          },
          slots.default?.(),
        );
      };
    },
  });
