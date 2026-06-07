import { cva } from "class-variance-authority";

const buttonVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-1.5",
    "rounded-md border border-transparent",
    "cursor-pointer text-16-medium whitespace-nowrap outline-none select-none",
    "transition-[background-color,color,opacity] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        fill: "active:scale-[0.98]",
        outline: "bg-background active:scale-[0.98]",
        soft: "border-transparent active:scale-[0.98]",
        ghost: "border-transparent active:scale-[0.98]",
        link: "border-transparent underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        secondary: "",
        success: "",
        danger: "",
      },
      size: {
        sm: "h-7 px-2.5",
        md: "h-9 px-3.5",
        lg: "h-11 px-5 text-32-bold",
      },
    },
    compoundVariants: [
      // Primary
      {
        color: "primary",
        variant: "fill",
        class: "bg-primary text-background hover:opacity-90",
      },
      {
        color: "primary",
        variant: "outline",
        class: "border-primary text-primary hover:bg-primary/10",
      },
      {
        color: "primary",
        variant: "soft",
        class: "bg-primary/10 text-primary hover:bg-primary/15",
      },
      {
        color: "primary",
        variant: "ghost",
        class: "text-primary hover:bg-primary/10",
      },
      {
        color: "primary",
        variant: "link",
        class: "text-primary",
      },
      // Secondary
      {
        color: "secondary",
        variant: "fill",
        class: "bg-secondary text-background hover:opacity-90",
      },
      {
        color: "secondary",
        variant: "outline",
        class: "border-secondary text-secondary hover:bg-secondary/10",
      },
      {
        color: "secondary",
        variant: "soft",
        class: "bg-secondary/10 text-secondary hover:bg-secondary/15",
      },
      {
        color: "secondary",
        variant: "ghost",
        class: "text-secondary hover:bg-secondary/10",
      },
      {
        color: "secondary",
        variant: "link",
        class: "text-secondary",
      },
      // Success
      {
        color: "success",
        variant: "fill",
        class: "bg-success text-background hover:opacity-90",
      },
      {
        color: "success",
        variant: "outline",
        class: "border-success text-success hover:bg-success/10",
      },
      {
        color: "success",
        variant: "soft",
        class: "bg-success/10 text-success hover:bg-success/15",
      },
      {
        color: "success",
        variant: "ghost",
        class: "text-success hover:bg-success/10",
      },
      {
        color: "success",
        variant: "link",
        class: "text-success",
      },
      // Danger
      {
        color: "danger",
        variant: "fill",
        class: "bg-danger text-background hover:opacity-90",
      },
      {
        color: "danger",
        variant: "outline",
        class: "border-danger text-danger hover:bg-danger/10",
      },
      {
        color: "danger",
        variant: "soft",
        class: "bg-danger/10 text-danger hover:bg-danger/15",
      },
      {
        color: "danger",
        variant: "ghost",
        class: "text-danger hover:bg-danger/10",
      },
      {
        color: "danger",
        variant: "link",
        class: "text-danger",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
      size: "md",
    },
  },
);

export { buttonVariants };
