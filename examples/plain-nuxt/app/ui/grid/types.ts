import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

/** Inline size: a number is px, a string is any CSS length. */
type Size = number | string;

/** Grid props; spacing props arrive as attributes (`@vue-ignore`). */
export interface GridProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  backgroundColor?: (typeof tokens)["colors"][number];
  borderColor?: (typeof tokens)["colors"][number];
  border?: (typeof tokens)["borderWidth"][number];
  borderX?: (typeof tokens)["borderWidth"][number];
  borderY?: (typeof tokens)["borderWidth"][number];
  borderT?: (typeof tokens)["borderWidth"][number];
  borderB?: (typeof tokens)["borderWidth"][number];
  borderL?: (typeof tokens)["borderWidth"][number];
  borderR?: (typeof tokens)["borderWidth"][number];
  rounded?: (typeof tokens)["borderRadius"][number];
  roundedT?: (typeof tokens)["borderRadius"][number];
  roundedB?: (typeof tokens)["borderRadius"][number];
  roundedL?: (typeof tokens)["borderRadius"][number];
  roundedR?: (typeof tokens)["borderRadius"][number];
  shadow?: (typeof tokens)["shadows"][number];
  backdropBlur?: (typeof tokens)["backDropBlurs"][number];
  position?: "absolute" | "relative" | "fixed" | "sticky";
  width?: Size;
  height?: Size;
  minWidth?: Size;
  minHeight?: Size;
  maxWidth?: Size;
  maxHeight?: Size;
  /** A count or a CSS track list (`"80px 1fr"`), per breakpoint. */
  columns?: ResponsiveValueStrict<number | string>;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  flow?: "row" | "column" | "dense";
}
