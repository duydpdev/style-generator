export { theme, tokens, type Theme } from "./tokens";
export { options } from "./style-gen.options";
export { cn } from "./cn";
export { axisAttributes } from "./axes";

export {
  splitSpacingProps,
  type SpacingProps,
} from "@duydpdev/style-generator/recipes";

export {
  buttonRecipe,
  intents,
  type ButtonVariants,
  type Intent,
} from "./recipes/button";
export { inputRecipe, type InputVariants } from "./recipes/input";
export { cardRecipe, type CardVariants } from "./recipes/card";
export { badgeRecipe, type BadgeVariants } from "./recipes/badge";
export { stackRecipe, type StackVariants } from "./recipes/stack";
export {
  dialogOverlayRecipe,
  dialogRecipe,
  type DialogOverlayVariants,
  type DialogVariants,
} from "./recipes/dialog";
export {
  textAlign,
  textDecoration,
  textRecipe,
  type TextStyleProps,
  type TextVariants,
} from "./recipes/text";
export {
  boxRecipe,
  type BoxSpacingProps,
  type BoxStyleProps,
  type BoxVariants,
} from "./recipes/box";
