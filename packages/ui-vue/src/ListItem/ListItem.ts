import { defineComponent, h } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { layoutProps, spacingProps } from "../shared/vueProps";

import type { ListItemDeps } from "./ListItem.types";

export const createListItem = <W extends UiTokens>(deps: ListItemDeps) =>
  defineComponent({
    name: "ListItem",
    props: {
      as: { type: String, default: "li" },
      ...layoutProps<W>(),
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const { as, ...own }: Readonly<Record<string, unknown>> = props;
        const split = splitStyleProps(own, deps.layout, deps.spacing);
        return h(
          as as string,
          {
            ...rootAttrs(deps.cn(split.className), split.style),
          },
          slots.default?.(),
        );
      };
    },
  });
