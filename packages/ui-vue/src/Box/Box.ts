import type { RecipeProps } from "design-system-example/recipes";
import { defineComponent, h } from "vue";

import { rootAttrs, splitStyleProps } from "../shared/splitStyleProps";
import type { UiTokens } from "../shared/types";
import { layoutProps, spacingProps } from "../shared/vueProps";

import type { BoxDeps } from "./Box.types";

const OVERLAY_KEYS = [
  "borderColor",
  "border",
  "borderX",
  "borderY",
  "borderT",
  "borderB",
  "borderL",
  "borderR",
  "rounded",
  "roundedT",
  "roundedB",
  "roundedL",
  "roundedR",
] as const;

export const createBox = <W extends UiTokens>(deps: BoxDeps) =>
  defineComponent({
    name: "Box",
    props: {
      as: { type: String, default: "div" },
      innerBorder: { type: Boolean, default: undefined },
      ...layoutProps<W>(),
      ...spacingProps<W>(deps.spacing),
    },
    setup(props, { slots }) {
      return () => {
        const { as, innerBorder, ...own }: Readonly<Record<string, unknown>> =
          props;
        const framed = innerBorder === true;
        const extra = framed
          ? { innerBorder: true, position: own.position ?? "relative" }
          : {};
        const split = splitStyleProps(own, deps.box, deps.spacing, extra);
        const overlay = Object.fromEntries(
          OVERLAY_KEYS.map((key) => [key, split.variants[key]]),
        );
        return h(
          as as string,
          {
            ...rootAttrs(deps.cn(split.className), split.style),
          },
          [
            slots.default?.(),
            framed
              ? h("span", {
                  "aria-hidden": "true",
                  class: deps.cn(
                    deps.box({
                      ...overlay,
                      overlay: true,
                      position: "absolute",
                    } as RecipeProps),
                  ),
                })
              : null,
          ],
        );
      };
    },
  });
