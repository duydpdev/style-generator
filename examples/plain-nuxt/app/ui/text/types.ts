import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | (typeof tokens)["colors"][number]
  | `${(typeof tokens)["colors"][number]}/${(typeof tokens)["opacities"][number]}`;

/** Text props; spacing props arrive as attributes (`@vue-ignore`). */
export interface TextProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  type?: (typeof tokens)["typography"][number];
  color?: ColorValue;
  align?: "left" | "center" | "right";
  decoration?: "underline" | "lineThrough" | "none";
  transform?: "uppercase" | "lowercase" | "capitalize" | "normalCase";
  italic?: boolean;
  truncate?: boolean;
  lineClamp?: 1 | 2 | 3 | 4 | 5 | 6 | "none";
  wrap?: "wrap" | "nowrap" | "balance" | "pretty";
}
