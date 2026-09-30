import { cva } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { DesignTokens } from "../../theme/design-tokens";

export const textStyle = cva("wrap-anywhere whitespace-pre-wrap", {
  variants: {
    type: createVariantMapper("", DesignTokens.Web.variantText),
    decoration: {
      underline: "underline",
      lineThrough: "line-through",
      none: "no-underline",
    },
    align: {
      center: "text-center",
      left: "text-left",
      right: "text-right",
    },
    color: createVariantMapper("text", DesignTokens.Web.variantColor),
  },
});
