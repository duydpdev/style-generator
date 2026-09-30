import { memo } from "react";

import { cn } from "../../lib/utils";

import { buttonVariants } from "./style";
import type { ButtonProps } from "./type";

const ButtonComponent = ({
  className,
  variant = "fill",
  color = "primary",
  size = "md",
  prefix,
  suffix,
  children,
  type = "button",
  ...props
}: ButtonProps) => {
  return (
    <button
      type={type}
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size }), className)}
      {...props}
    >
      {prefix && <span data-icon="start">{prefix}</span>}
      <span>{children}</span>
      {suffix && <span data-icon="end">{suffix}</span>}
    </button>
  );
};

const Button = memo(ButtonComponent);

export { Button };
