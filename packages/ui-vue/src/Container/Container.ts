import { defineComponent, h } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { layoutProps, spacingProps } from "../shared/vueProps";

import type { ContainerDeps } from "./Container.types";

/** No horizontal margins: the container centres itself (`mx-auto`). */
const NO_MARGIN_X = ["m", "mx", "ml", "mr"] as const;

export const createContainer = <W extends UiTokens>(deps: ContainerDeps) =>
  defineComponent({
    name: "Container",
    props: {
      as: { type: String, default: "div" },
      ...layoutProps<W>(),
      ...spacingProps<W, (typeof NO_MARGIN_X)[number]>(
        deps.spacing,
        NO_MARGIN_X,
      ),
    },
    setup(props, { slots }) {
      return () => {
        const { as, ...own }: Readonly<Record<string, unknown>> = props;
        const split = splitStyleProps(own, deps.layout, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(
              deps.cn(deps.container(), split.className),
              split.style,
            ),
          },
          slots.default?.(),
        );
      };
    },
  });
