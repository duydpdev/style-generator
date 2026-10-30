import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h, type PropType } from "vue";

import { rootAttrs, splitSpacing } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { spacingProps, stringProp, type ControlSize } from "../shared/vueProps";

import type { ButtonDeps } from "./Button.types";

/** `prefix` and `suffix` are named slots; `type` is an attribute (`button` by default). */
export const createButton = <W extends UiTokens, B extends string>(
  deps: ButtonDeps,
) =>
  defineComponent({
    name: "Button",
    props: {
      as: { type: String, default: "button" },
      variant: {
        type: String as PropType<
          "fill" | "outline" | "soft" | "ghost" | "link"
        >,
        default: undefined,
      },
      color: stringProp<B>(),
      size: { type: String as PropType<ControlSize>, default: undefined },
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const {
          as,
          variant,
          color,
          size,
          ...own
        }: Readonly<Record<string, unknown>> = props;
        const spacing = splitSpacing(own, deps.spacing);
        return h(
          as as string,
          {
            type: as === "button" ? "button" : undefined,
            "data-slot": "button",
            ...rootAttrs(
              deps.cn(
                deps.button({ variant, color, size } as RecipeProps),
                spacing.className,
              ),
              spacing.style,
            ),
          },
          [
            slots.prefix
              ? h("span", { "data-icon": "start" }, slots.prefix())
              : null,
            h("span", slots.default?.()),
            slots.suffix
              ? h("span", { "data-icon": "end" }, slots.suffix())
              : null,
          ],
        );
      };
    },
  });
