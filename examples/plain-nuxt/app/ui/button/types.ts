import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

import type { ButtonIntent } from "./style";

/** Button props; spacing props arrive as attributes (`@vue-ignore`). */
export interface ButtonProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  variant?: "fill" | "outline" | "soft" | "ghost" | "link";
  /** One of `buttonIntents`. */
  color?: ButtonIntent;
  size?: "sm" | "md" | "lg";
}
