import { memo, type ComponentProps, type ElementType } from "react";
import type {
  ColorVariant,
  TextVariant,
} from "@duydpdev/style-generator/types";
import {
  cn,
  textRecipe,
  type textAlign,
  type textDecoration,
  type Theme,
} from "design-system-example";

export type TextProps = Omit<ComponentProps<"p">, "color"> & {
  type?: TextVariant<Theme>;
  decoration?: (typeof textDecoration)[number];
  align?: (typeof textAlign)[number];
  as?: ElementType;
  color?: ColorVariant<Theme>;
};

const TextComponent = ({
  type = "text16Medium",
  color = "foreground",
  as,
  decoration,
  align,
  children,
  className,
  ...props
}: TextProps) => {
  const Component = as ?? "p";
  return (
    <Component
      className={cn(textRecipe({ type, decoration, align, color }), className)}
      {...props}
    >
      {children}
    </Component>
  );
};

export const Text = memo(TextComponent);
