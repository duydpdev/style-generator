import { cva } from "class-variance-authority";
import { createVariantMapper } from "@duydpdev/style-generator/cva";

import { DesignTokens } from "../../theme/design-tokens";

export const boxStyle = cva("relative", {
  variants: {
    backgroundColor: createVariantMapper("bg", DesignTokens.Web.variantColor),
    borderColor: createVariantMapper("border", DesignTokens.Web.variantColor),
    border: createVariantMapper("border", DesignTokens.Web.borderOption, true),
    borderX: createVariantMapper(
      "border-x",
      DesignTokens.Web.borderOption,
      true,
    ),
    borderY: createVariantMapper(
      "border-y",
      DesignTokens.Web.borderOption,
      true,
    ),
    borderT: createVariantMapper(
      "border-t",
      DesignTokens.Web.borderOption,
      true,
    ),
    borderB: createVariantMapper(
      "border-b",
      DesignTokens.Web.borderOption,
      true,
    ),
    borderL: createVariantMapper(
      "border-l",
      DesignTokens.Web.borderOption,
      true,
    ),
    borderR: createVariantMapper(
      "border-r",
      DesignTokens.Web.borderOption,
      true,
    ),
    rounded: createVariantMapper(
      "rounded",
      DesignTokens.Web.roundedOption,
      true,
    ),
    roundedT: createVariantMapper(
      "rounded-t",
      DesignTokens.Web.roundedOption,
      true,
    ),
    roundedB: createVariantMapper(
      "rounded-b",
      DesignTokens.Web.roundedOption,
      true,
    ),
    roundedL: createVariantMapper(
      "rounded-l",
      DesignTokens.Web.roundedOption,
      true,
    ),
    roundedR: createVariantMapper(
      "rounded-r",
      DesignTokens.Web.roundedOption,
      true,
    ),
    shadow: createVariantMapper("shadow", DesignTokens.Web.variantShadow, true),
    backdropBlur: createVariantMapper(
      "backdrop-blur",
      DesignTokens.Web.variantBackdropBlur,
      true,
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
