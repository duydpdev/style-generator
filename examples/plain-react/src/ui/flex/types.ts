import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

/** Inline size: a number is px (as React does), a string is any CSS length. */
type Size = number | string;

/**
 * Layout props: box-recipe variants, inline sizes and spacing. Declared in
 * each folder (the kit publishes no `LayoutProps`), next to the key tuples
 * that `style.ts` passes to `splitLayout`.
 */
export type LayoutProps = ThemeSpacingProps<Tokens> & {
  readonly backgroundColor?: Tokens["colors"][number] | undefined;
  readonly borderColor?: Tokens["colors"][number] | undefined;
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
  readonly width?: Size | undefined;
  readonly height?: Size | undefined;
  readonly minWidth?: Size | undefined;
  readonly minHeight?: Size | undefined;
  readonly maxWidth?: Size | undefined;
  readonly maxHeight?: Size | undefined;
};

export type FlexOwnProps = LayoutProps & {
  readonly direction?: "row" | "column" | undefined;
  readonly align?: "start" | "center" | "end" | "stretch" | undefined;
  readonly justify?: "start" | "center" | "end" | "between" | undefined;
  readonly wrap?: boolean | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type FlexProps<T extends ElementType = "div"> = Polymorphic<
  T,
  FlexOwnProps
>;
