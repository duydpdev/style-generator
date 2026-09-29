import { cva } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { DesignTokens } from "../theme/design-tokens";

export const boxStyle = cva("relative", {
  variants: {
    backgroundColor: createVariantMapper("bg", DesignTokens.Web.variantColor),
    borderColor: createVariantMapper("border", DesignTokens.Web.variantColor),
    border: createVariantMapper("border", DesignTokens.Web.borderWidthOption),
    borderX: createVariantMapper(
      "border-x",
      DesignTokens.Web.borderWidthOption,
    ),
    borderY: createVariantMapper(
      "border-y",
      DesignTokens.Web.borderWidthOption,
    ),
    borderT: createVariantMapper(
      "border-t",
      DesignTokens.Web.borderWidthOption,
    ),
    borderB: createVariantMapper(
      "border-b",
      DesignTokens.Web.borderWidthOption,
    ),
    borderL: createVariantMapper(
      "border-l",
      DesignTokens.Web.borderWidthOption,
    ),
    borderR: createVariantMapper(
      "border-r",
      DesignTokens.Web.borderWidthOption,
    ),
    rounded: createVariantMapper("rounded", DesignTokens.Web.roundedOption),
    roundedT: createVariantMapper("rounded-t", DesignTokens.Web.roundedOption),
    roundedB: createVariantMapper("rounded-b", DesignTokens.Web.roundedOption),
    roundedL: createVariantMapper("rounded-l", DesignTokens.Web.roundedOption),
    roundedR: createVariantMapper("rounded-r", DesignTokens.Web.roundedOption),
    shadow: createVariantMapper("shadow", DesignTokens.Web.variantShadow),
    backdropBlur: createVariantMapper(
      "backdrop-blur",
      DesignTokens.Web.variantBackdropBlur,
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
