import type { ThemeSpacingProps } from "@duydpdev/style-generator/ui";
import type { Polymorphic } from "@duydpdev/style-generator/ui-react";
import type { CSSProperties, ElementType } from "react";

import type { tokens } from "../../theme";

type Tokens = typeof tokens;

export type TextOwnProps = ThemeSpacingProps<Tokens> & {
  readonly type?: Tokens["typography"][number] | undefined;
  readonly color?: Tokens["colors"][number] | undefined;
  readonly align?: "left" | "center" | "right" | undefined;
  readonly decoration?: "underline" | "lineThrough" | "none" | undefined;
  readonly className?: string | undefined;
  readonly style?: CSSProperties | undefined;
};

export type TextProps<T extends ElementType = "p"> = Polymorphic<
  T,
  TextOwnProps
>;
