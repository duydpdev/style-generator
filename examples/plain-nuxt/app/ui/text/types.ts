import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

/** Text props; spacing props arrive as attributes (`@vue-ignore`). */
export interface TextProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  type?: (typeof tokens)["typography"][number];
  color?: (typeof tokens)["colors"][number];
  align?: "left" | "center" | "right";
  decoration?: "underline" | "lineThrough" | "none";
}
