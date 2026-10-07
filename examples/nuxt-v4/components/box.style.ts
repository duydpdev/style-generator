import { cva } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { DesignTokens } from "../theme/design-tokens";

export const boxStyle = cva("relative", {
  variants: {
    backgroundColor: createVariantMapper("bg", DesignTokens.Web.colors),
    borderColor: createVariantMapper("border", DesignTokens.Web.colors),
    border: createVariantMapper("border", DesignTokens.Web.borderWidth),
    borderX: createVariantMapper("border-x", DesignTokens.Web.borderWidth),
    borderY: createVariantMapper("border-y", DesignTokens.Web.borderWidth),
    borderT: createVariantMapper("border-t", DesignTokens.Web.borderWidth),
    borderB: createVariantMapper("border-b", DesignTokens.Web.borderWidth),
    borderL: createVariantMapper("border-l", DesignTokens.Web.borderWidth),
    borderR: createVariantMapper("border-r", DesignTokens.Web.borderWidth),
    rounded: createVariantMapper("rounded", DesignTokens.Web.borderRadius),
    roundedT: createVariantMapper("rounded-t", DesignTokens.Web.borderRadius),
    roundedB: createVariantMapper("rounded-b", DesignTokens.Web.borderRadius),
    roundedL: createVariantMapper("rounded-l", DesignTokens.Web.borderRadius),
    roundedR: createVariantMapper("rounded-r", DesignTokens.Web.borderRadius),
    shadow: createVariantMapper("shadow", DesignTokens.Web.shadows),
    backdropBlur: createVariantMapper(
      "backdrop-blur",
      DesignTokens.Web.backDropBlurs,
    ),
    position: {
      absolute: "absolute",
      relative: "relative",
      fixed: "fixed",
      sticky: "sticky",
    },
    innerBorder: {
      true: "!border-none",
    },
  },
});
