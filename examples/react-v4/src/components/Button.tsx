import { memo, type ButtonHTMLAttributes, type ReactNode } from "react";
import { buttonRecipe, cn, type ButtonVariants } from "design-system-example";

export type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "prefix" | "color"
> &
  ButtonVariants & {
    prefix?: ReactNode;
    suffix?: ReactNode;
  };

const ButtonComponent = ({
  className,
  variant,
  color,
  size,
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
      className={cn(buttonRecipe({ variant, color, size }), className)}
      {...props}
    >
      {prefix && <span data-icon="start">{prefix}</span>}
      <span>{children}</span>
      {suffix && <span data-icon="end">{suffix}</span>}
    </button>
  );
};

export const Button = memo(ButtonComponent);
