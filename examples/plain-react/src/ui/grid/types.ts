import type { ResponsiveValueStrict } from "@duydpdev/style-generator/types";
import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

/** A color token, or `token/step` with a step from `coverage.colors.opacities`. */
type ColorValue =
  | Tokens["colors"][number]
  | `${Tokens["colors"][number]}/${Tokens["opacities"][number]}`;

/** Inline size: a number is px (as React does), a string is any CSS length. */
type Size = number | string;

/**
 * Layout props: box-recipe variants, inline sizes and spacing. Declared in
 * each folder (the kit publishes no `LayoutProps`), next to the key tuples
 * that `style.ts` passes to `splitLayout`.
 */
export type LayoutProps = ThemeSpacingProps<Tokens> & {
  readonly backgroundColor?: ColorValue | undefined;
  readonly borderColor?: ColorValue | undefined;
  readonly border?: Tokens["borderWidth"][number] | undefined;
  readonly borderX?: Tokens["borderWidth"][number] | undefined;
  readonly borderY?: Tokens["borderWidth"][number] | undefined;
  readonly borderT?: Tokens["borderWidth"][number] | undefined;
  readonly borderB?: Tokens["borderWidth"][number] | undefined;
  readonly borderL?: Tokens["borderWidth"][number] | undefined;
  readonly borderR?: Tokens["borderWidth"][number] | undefined;
  readonly rounded?: Tokens["borderRadius"][number] | undefined;
  readonly roundedT?: Tokens["borderRadius"][number] | undefined;
  readonly roundedB?: Tokens["borderRadius"][number] | undefined;
  readonly roundedL?: Tokens["borderRadius"][number] | undefined;
  readonly roundedR?: Tokens["borderRadius"][number] | undefined;
  readonly shadow?: Tokens["shadows"][number] | undefined;
  readonly backdropBlur?: Tokens["backDropBlurs"][number] | undefined;
  readonly position?: "absolute" | "relative" | "fixed" | "sticky" | undefined;
  readonly display?:
    | "block"
    | "inlineBlock"
    | "inline"
    | "flex"
    | "inlineFlex"
    | "grid"
    | "contents"
    | "hidden"
    | undefined;
  readonly overflow?:
    | "auto"
    | "hidden"
    | "clip"
    | "visible"
    | "scroll"
    | undefined;
  readonly zIndex?: 0 | 10 | 20 | 30 | 40 | 50 | "auto" | undefined;
  readonly opacity?:
    | 0
    | 10
    | 20
    | 30
    | 40
    | 50
    | 60
    | 70
    | 80
    | 90
    | 100
    | undefined;
  readonly cursor?:
    | "auto"
    | "default"
    | "pointer"
    | "notAllowed"
    | "grab"
    | "grabbing"
    | "text"
    | "move"
    | undefined;
  readonly pointerEvents?: "none" | "auto" | undefined;
  readonly select?: "none" | "text" | "all" | "auto" | undefined;
  readonly transition?:
    | "none"
    | "all"
    | "colors"
    | "opacity"
    | "shadow"
    | "transform"
    | undefined;
  readonly aspect?: "auto" | "square" | "video" | undefined;
  readonly objectFit?:
    | "contain"
    | "cover"
    | "fill"
    | "none"
    | "scaleDown"
    | undefined;
  readonly visibility?: "visible" | "invisible" | "collapse" | undefined;
  readonly ringColor?: ColorValue | undefined;
  readonly outlineColor?: ColorValue | undefined;
  readonly width?: Size | undefined;
  readonly height?: Size | undefined;
  readonly minWidth?: Size | undefined;
  readonly minHeight?: Size | undefined;
  readonly maxWidth?: Size | undefined;
  readonly maxHeight?: Size | undefined;
};

export type GridOwnProps = LayoutProps & {
  /** A count or a CSS track list (`"80px 1fr"`), per breakpoint. */
  readonly columns?: ResponsiveValueStrict<number | string> | undefined;
  readonly align?: "start" | "center" | "end" | "stretch" | undefined;
  readonly justify?: "start" | "center" | "end" | "between" | undefined;
  readonly flow?: "row" | "column" | "dense" | undefined;
  /** Row count (`grid-rows-N`); on `as="textarea"` it is this prop, not the HTML `rows` attribute. */
  readonly rows?: 1 | 2 | 3 | 4 | 5 | 6 | "none" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type GridProps<T extends ElementType = "div"> = Polymorphic<
  T,
  GridOwnProps
>;
