import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType, ReactNode } from "react";

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

export type BoxOwnProps = LayoutProps & {
  /** An overlay frame drawn by a span, not the element's border, so it takes no layout space. */
  readonly innerBorder?: boolean | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
  readonly children?: ReactNode;
};

export type BoxProps<T extends ElementType = "div"> = Polymorphic<
  T,
  BoxOwnProps
>;
