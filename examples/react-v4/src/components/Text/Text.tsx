import { memo } from "react";

import { cn } from "../../lib/utils";

import { textStyle } from "./style";
import type { TextProps } from "./type";

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
      className={cn(textStyle({ type, decoration, align, color }), className)}
      {...props}
    >
      {children}
    </Component>
  );
};

const Text = memo(TextComponent);
export { Text };
