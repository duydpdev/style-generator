import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";

import type { tokens } from "../../theme";

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | (typeof tokens)["colors"][number]
  | `${(typeof tokens)["colors"][number]}/${(typeof tokens)["opacities"][number]}`;

/** Inline size: a number is px, a string is any CSS length. */
type Size = number | string;

/** Flex props; spacing props arrive as attributes (`@vue-ignore`). */
export interface FlexProps extends /* @vue-ignore */ ThemeSpacingProps<
  typeof tokens
> {
  as?: string;
  backgroundColor?: ColorValue;
  borderColor?: ColorValue;
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
  display?:
    | "block"
    | "inlineBlock"
    | "inline"
    | "flex"
    | "inlineFlex"
    | "grid"
    | "contents"
    | "hidden";
  overflow?: "auto" | "hidden" | "clip" | "visible" | "scroll";
  zIndex?: 0 | 10 | 20 | 30 | 40 | 50 | "auto";
  opacity?: 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
  cursor?:
    | "auto"
    | "default"
    | "pointer"
    | "notAllowed"
    | "grab"
    | "grabbing"
    | "text"
    | "move";
  pointerEvents?: "none" | "auto";
  select?: "none" | "text" | "all" | "auto";
  transition?: "none" | "all" | "colors" | "opacity" | "shadow" | "transform";
  aspect?: "auto" | "square" | "video";
  objectFit?: "contain" | "cover" | "fill" | "none" | "scaleDown";
  visibility?: "visible" | "invisible" | "collapse";
  ringColor?: ColorValue;
  outlineColor?: ColorValue;
  width?: Size;
  height?: Size;
  minWidth?: Size;
  minHeight?: Size;
  maxWidth?: Size;
  maxHeight?: Size;
  direction?: "row" | "column";
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  divideColor?: ColorValue;
  /** Item props: `grow`/`shrink` toggle `grow`/`grow-0` and `shrink`/`shrink-0`; `basis` is `basis-*`. */
  grow?: boolean;
  shrink?: boolean;
  basis?: 0 | "auto" | "full" | "1/2" | "1/3" | "2/3" | "1/4" | "3/4";
}
