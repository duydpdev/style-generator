import type { ComponentProps, ElementType } from "react";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";

import type { Theme } from "../../theme/design-tokens";

export const textAlign = ["left", "center", "right"] as const;
export const textDecoration = ["underline", "lineThrough", "none"] as const;

export interface TextProps extends Omit<ComponentProps<"p">, "color"> {
  type?: TextVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  as?: ElementType;
  color?: ColorVariant<Theme>;
}
