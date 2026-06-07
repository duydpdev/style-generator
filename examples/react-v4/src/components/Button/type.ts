import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { VariantProps } from "class-variance-authority";

import type { buttonVariants } from "./style";

type ButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "prefix" | "color"
> &
  VariantProps<typeof buttonVariants> & {
    prefix?: ReactNode;
    suffix?: ReactNode;
  };

export type { ButtonProps };
